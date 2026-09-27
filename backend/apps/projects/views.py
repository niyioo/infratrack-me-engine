from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.common.constants import ProjectStatus
from apps.projects.models import Project, ProjectAssignment
from apps.projects.serializers import (
    ProjectSerializer,
    ProjectDetailSerializer,
    ProjectCreateUpdateSerializer,
    ProjectAssignmentSerializer,
    ProjectLifecycleEventSerializer,
)
from apps.analytics.services import AnalyticsService
from apps.projects.services import ProjectService
from apps.audits.services import AuditService
from apps.notifications.services import NotificationService
from apps.projects.tasks import dispatch_project_alerts_task
from apps.common.permissions import (
    HIGH_PRIVILEGE_ROLE_CODES,
    HasActionCapability,
    IsProjectVisibleToUser,
    get_user_role_codes,
    is_project_managed_by_user,
)
from apps.common.pagination import OptionalPaginationMixin

ASSIGNABLE_PROJECT_ROLES = {"M_E_OFFICER", "FIELD_OFFICER", "CONTRACTOR", "QA_OFFICER", "FINANCE_OFFICER"}
INITIAL_PROJECT_STATUSES = {ProjectStatus.NOT_STARTED, ProjectStatus.ACTIVE}
PROJECT_AUDIT_FIELDS = [
    "id", "project_code", "title", "agency", "contractor", "current_status", "risk_status",
    "state", "lga", "budget_amount", "geo_fence_radius_meters",
]


class ProjectViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    """
    Project API

    Supports:
    - CRUD operations
    - assignment-aware filtering
    - role-based access
    - search + filtering
    """

    queryset = Project.objects.select_related("agency", "contractor").all()
    permission_classes = [permissions.IsAuthenticated, IsProjectVisibleToUser]
    action_capability_map = {
        "create": ("projects.manage",),
        "update": ("projects.manage",),
        "partial_update": ("projects.manage",),
        "destroy": ("projects.manage",),
        "assign_user": ("projects.manage",),
        "unassign_user": ("projects.manage",),
        "change_status": ("projects.manage",),
        "dispatch_alerts": ("projects.dispatch_alerts",),
        "dispatch_reporting_reminder": ("projects.dispatch_alerts",),
        "lifecycle_events": ("projects.view_lifecycle",),
    }

    search_fields = ["project_code", "title", "state", "lga"]
    filterset_fields = [
        "state",
        "lga",
        "category",
        "current_status",
        "risk_status",
        "agency",
        "contractor",
    ]
    ordering_fields = [
        "created_at",
        "start_date",
        "expected_end_date",
        "budget_amount",
    ]

    def get_permissions(self):
        base_permissions = [permissions.IsAuthenticated(), HasActionCapability()]
        if self.action == "create":
            return base_permissions
        return [*base_permissions, IsProjectVisibleToUser()]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ProjectCreateUpdateSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_queryset(self):
        """
        Restrict project visibility based on user role
        """
        user = self.request.user
        queryset = super().get_queryset()

        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                "milestones",
                "tranches",
                "fraud_flags",
                "evidence_submissions",
                "geofenceexceptionrequest_set",
            )

        if user.is_superuser:
            return queryset

        user_roles = set(user.roles.values_list("code", flat=True))

        # High-level roles see all projects
        if user_roles.intersection(HIGH_PRIVILEGE_ROLE_CODES):
            return queryset

        # Others see only assigned projects
        return queryset.filter(
            assignments__user=user,
            assignments__is_active=True
        ).distinct()

    def perform_create(self, serializer):
        initial_status = serializer.validated_data.get("current_status", ProjectStatus.NOT_STARTED)
        if initial_status not in INITIAL_PROJECT_STATUSES:
            raise ValidationError({"current_status": "New projects must start as NOT_STARTED or ACTIVE."})
        project = serializer.save(created_by=self.request.user)

        # Automatically assign creator as M&E Officer
        ProjectAssignment.objects.create(
            project=project,
            user=self.request.user,
            assignment_role="M_E_OFFICER",
            assigned_by=self.request.user,
        )

        AuditService.log_event(
            event_type="PROJECT_CREATED",
            actor=self.request.user,
            project=project,
            action="CREATE",
            object_type="Project",
            object_id=str(project.id),
            after_state=AuditService.snapshot_model(
                project,
                fields=[
                    "id",
                    "project_code",
                    "title",
                    "agency",
                    "contractor",
                    "current_status",
                    "risk_status",
                    "state",
                    "lga",
                    "budget_amount",
                ],
            ),
            request=self.request,
        )

    def perform_update(self, serializer):
        project = serializer.instance
        self._ensure_can_manage_project(project)
        before_state = AuditService.snapshot_model(project, fields=PROJECT_AUDIT_FIELDS)

        # Route status changes through ProjectService so they land in status history
        # and the lifecycle log, exactly like the change_status action.
        new_status = serializer.validated_data.pop("current_status", project.current_status)
        project = serializer.save()
        if new_status != project.current_status:
            ProjectService.change_status(
                project=project,
                to_status=new_status,
                user=self.request.user,
                reason="Status changed via project edit.",
            )

        AuditService.log_event(
            event_type="PROJECT_UPDATED",
            actor=self.request.user,
            project=project,
            action="UPDATE",
            object_type="Project",
            object_id=str(project.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(project, fields=PROJECT_AUDIT_FIELDS),
            request=self.request,
        )

    def perform_destroy(self, instance):
        self._ensure_can_manage_project(instance)
        if instance.disbursements.exists():
            raise PermissionDenied("Projects with recorded disbursements cannot be deleted.")
        before_state = AuditService.snapshot_model(instance, fields=PROJECT_AUDIT_FIELDS)
        project_id = instance.id
        instance.delete()
        AuditService.log_event(
            event_type="PROJECT_DELETED",
            actor=self.request.user,
            action="DELETE",
            object_type="Project",
            object_id=str(project_id),
            before_state=before_state,
            request=self.request,
        )

    def _ensure_can_manage_project(self, project):
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage this project.")

    # -----------------------------
    # 🔹 Custom Actions
    # -----------------------------

    @action(detail=True, methods=["get"])
    def assignments(self, request, pk=None):
        """
        Get all users assigned to this project
        """
        project = self.get_object()
        assignments = project.assignments.select_related("user")
        return Response(ProjectAssignmentSerializer(assignments, many=True).data)

    @action(detail=True, methods=["post"])
    def assign_user(self, request, pk=None):
        """
        Assign a user to a project
        """
        project = self.get_object()
        self._ensure_can_manage_project(project)

        user_id = request.data.get("user_id")
        role = request.data.get("assignment_role")

        if not user_id or not role:
            return Response(
                {"detail": "user_id and assignment_role are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user = User.objects.filter(id=user_id, is_active=True).first()
        if target_user is None:
            return Response(
                {"detail": "Specified user does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in ASSIGNABLE_PROJECT_ROLES:
            return Response(
                {"detail": "Invalid assignment role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The project role must match a role the user actually holds, otherwise an
        # assignment could be used to escalate privileges on this project.
        if not target_user.is_superuser and role not in get_user_role_codes(target_user):
            return Response(
                {"detail": "User does not hold the requested role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment, created = ProjectAssignment.objects.get_or_create(
            project=project,
            user_id=user_id,
            assignment_role=role,
            defaults={
                "assigned_by": request.user,
                "is_active": True,
            },
        )

        if not created:
            assignment.is_active = True
            assignment.save(update_fields=["is_active"])

        AuditService.log_event(
            event_type="PROJECT_ASSIGNMENT_UPDATED" if not created else "PROJECT_ASSIGNMENT_CREATED",
            actor=request.user,
            project=project,
            action="ASSIGN_USER",
            object_type="ProjectAssignment",
            object_id=str(assignment.id),
            after_state=AuditService.snapshot_model(
                assignment,
                fields=["id", "project", "user", "assignment_role", "is_active", "assigned_by"],
            ),
            metadata={"assigned_user_id": user_id, "assignment_role": role},
            request=request,
        )

        return Response({
            "detail": "User assigned successfully",
            "assignment_id": assignment.id,
        })

    @action(detail=True, methods=["post"])
    def unassign_user(self, request, pk=None):
        """
        Deactivate user assignment
        """
        project = self.get_object()
        self._ensure_can_manage_project(project)
        user_id = request.data.get("user_id")

        assignment = ProjectAssignment.objects.filter(
            project=project,
            user_id=user_id,
            is_active=True,
        ).first()

        if not assignment:
            return Response(
                {"detail": "Active assignment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        before_state = AuditService.snapshot_model(
            assignment,
            fields=["id", "project", "user", "assignment_role", "is_active", "assigned_by"],
        )
        assignment.is_active = False
        assignment.save(update_fields=["is_active"])

        AuditService.log_event(
            event_type="PROJECT_ASSIGNMENT_REMOVED",
            actor=request.user,
            project=project,
            action="UNASSIGN_USER",
            object_type="ProjectAssignment",
            object_id=str(assignment.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(
                assignment,
                fields=["id", "project", "user", "assignment_role", "is_active", "assigned_by"],
            ),
            metadata={"unassigned_user_id": user_id},
            request=request,
        )

        return Response({"detail": "User unassigned successfully"})

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        """
        Change project status (audited)
        """
        project = self.get_object()
        self._ensure_can_manage_project(project)
        to_status = request.data.get("status")
        reason = request.data.get("reason", "")

        if not to_status:
            return Response(
                {"detail": "status is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if to_status not in ProjectStatus.values:
            return Response(
                {"detail": "Invalid project status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectService.change_status(
            project=project,
            to_status=to_status,
            user=request.user,
            reason=reason,
        )

        project.refresh_from_db(fields=["current_status"])

        return Response({"detail": "Project status updated"})

    @action(detail=True, methods=["post"], url_path="dispatch-alerts")
    def dispatch_alerts(self, request, pk=None):
        project = self.get_object()
        self._ensure_can_manage_project(project)
        queue = str(request.data.get("queue", "")).lower() in {"1", "true", "yes"}
        if queue:
            dispatch_project_alerts_task.delay(project.id)
            return Response(
                {
                    "detail": "Project alert dispatch queued.",
                    "project_id": project.id,
                    "queued": True,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        alerts = AnalyticsService.build_project_alerts(project)

        if not alerts:
            return Response({"detail": "No active alerts to dispatch.", "notifications_created": 0})

        notifications = NotificationService.notify_project_alerts(project, alerts)
        return Response(
            {
                "detail": "Project alerts dispatched.",
                "notifications_created": len(notifications),
                "alerts": alerts,
            }
        )

    @action(detail=True, methods=["post"], url_path="dispatch-reporting-reminder")
    def dispatch_reporting_reminder(self, request, pk=None):
        project = self.get_object()
        self._ensure_can_manage_project(project)

        notifications = NotificationService.notify_reporting_compliance(project)
        if not notifications:
            return Response({"detail": "No active reporting reminder for this project.", "notifications_created": 0})

        return Response(
            {
                "detail": "Reporting reminder dispatched.",
                "notifications_created": len(notifications),
            }
        )

    @action(detail=True, methods=["get"], url_path="lifecycle-events")
    def lifecycle_events(self, request, pk=None):
        project = self.get_object()
        events = project.lifecycle_events.select_related("created_by").all()
        return Response(ProjectLifecycleEventSerializer(events, many=True).data)
