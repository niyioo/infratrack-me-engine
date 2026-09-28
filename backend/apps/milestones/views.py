from django.db.models import Count, IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from apps.milestones.models import (
    MilestoneTemplate,
    ProjectMilestone,
    MilestoneDependency,
    MilestoneChecklistItem,
)
from apps.milestones.serializers import (
    MilestoneTemplateSerializer,
    ProjectMilestoneSerializer,
    MilestoneDependencySerializer,
    MilestoneChecklistItemSerializer,
)
from apps.audits.services import AuditService
from apps.common.constants import SubmissionStatus
from apps.evidence.models import EvidenceSubmission
from apps.common.permissions import (
    HIGH_PRIVILEGE_ROLE_CODES,
    HasActionCapability,
    get_user_role_codes,
    is_project_managed_by_user,
)


def _ensure_parent_unchanged(serializer, field):
    new_value = serializer.validated_data.get(field)
    if new_value is not None and new_value != getattr(serializer.instance, field):
        raise PermissionDenied(f"{field} cannot be changed after creation.")


class MilestoneTemplateViewSet(viewsets.ModelViewSet):
    queryset = MilestoneTemplate.objects.all()
    serializer_class = MilestoneTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    # Templates are shared across every project, so only project managers may change them.
    action_capability_map = {
        "create": ("projects.manage",),
        "update": ("projects.manage",),
        "partial_update": ("projects.manage",),
        "destroy": ("projects.manage",),
    }


# Submissions that count toward a milestone's evidence requirement: accepted onto
# the site and not sent back or thrown out by QA.
COUNTED_SUBMISSION_STATUSES = [
    SubmissionStatus.SUBMITTED,
    SubmissionStatus.UNDER_REVIEW,
    SubmissionStatus.APPROVED,
]


def _with_evidence_counts(queryset):
    # A subquery rather than a join-based Count: the assignment filter below joins
    # through projects and would multiply the count.
    counted = (
        EvidenceSubmission.objects.filter(
            milestone=OuterRef("pk"), submission_status__in=COUNTED_SUBMISSION_STATUSES
        )
        .order_by()
        .values("milestone")
        .annotate(n=Count("pk"))
        .values("n")
    )
    return queryset.annotate(
        submitted_evidence_count=Coalesce(Subquery(counted, output_field=IntegerField()), 0)
    )


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    queryset = ProjectMilestone.objects.prefetch_related("checklist_items", "dependencies").all()
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "current_status", "sequence_order"]

    def get_queryset(self):
        user = self.request.user
        queryset = _with_evidence_counts(self.queryset)
        if user.is_superuser:
            return queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(HIGH_PRIVILEGE_ROLE_CODES):
            return queryset

        return queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestones for this project.")
        milestone = serializer.save()
        AuditService.log_event(
            event_type="MILESTONE_CREATED",
            actor=self.request.user,
            project=project,
            milestone=milestone,
            action="CREATE",
            object_type="ProjectMilestone",
            object_id=str(milestone.id),
            after_state=AuditService.snapshot_model(
                milestone,
                fields=["id", "project", "template", "title", "sequence_order", "current_status", "due_date"],
            ),
            request=self.request,
        )

    def perform_update(self, serializer):
        project = serializer.instance.project
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestones for this project.")
        before_state = AuditService.snapshot_model(
            serializer.instance,
            fields=["id", "project", "template", "title", "sequence_order", "current_status", "due_date"],
        )
        milestone = serializer.save()
        AuditService.log_event(
            event_type="MILESTONE_UPDATED",
            actor=self.request.user,
            project=project,
            milestone=milestone,
            action="UPDATE",
            object_type="ProjectMilestone",
            object_id=str(milestone.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(
                milestone,
                fields=["id", "project", "template", "title", "sequence_order", "current_status", "due_date"],
            ),
            request=self.request,
        )

    def perform_destroy(self, instance):
        if not is_project_managed_by_user(instance.project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestones for this project.")
        before_state = AuditService.snapshot_model(
            instance,
            fields=["id", "project", "template", "title", "sequence_order", "current_status", "due_date"],
        )
        milestone_id = instance.id
        project = instance.project
        instance.delete()
        AuditService.log_event(
            event_type="MILESTONE_DELETED",
            actor=self.request.user,
            project=project,
            action="DELETE",
            object_type="ProjectMilestone",
            object_id=str(milestone_id),
            before_state=before_state,
            request=self.request,
        )


class MilestoneDependencyViewSet(viewsets.ModelViewSet):
    queryset = MilestoneDependency.objects.all()
    serializer_class = MilestoneDependencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(HIGH_PRIVILEGE_ROLE_CODES):
            return self.queryset

        return self.queryset.filter(
            project_milestone__project__assignments__user=user,
            project_milestone__project__assignments__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project_milestone"].project
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone dependencies for this project.")
        serializer.save()

    def perform_update(self, serializer):
        project = serializer.instance.project_milestone.project
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone dependencies for this project.")
        _ensure_parent_unchanged(serializer, "project_milestone")
        serializer.save()

    def perform_destroy(self, instance):
        if not is_project_managed_by_user(instance.project_milestone.project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone dependencies for this project.")
        instance.delete()


class MilestoneChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = MilestoneChecklistItem.objects.all()
    serializer_class = MilestoneChecklistItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(HIGH_PRIVILEGE_ROLE_CODES):
            return self.queryset

        return self.queryset.filter(
            project_milestone__project__assignments__user=user,
            project_milestone__project__assignments__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project_milestone"].project
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone checklist items for this project.")
        serializer.save()

    def perform_update(self, serializer):
        project = serializer.instance.project_milestone.project
        if not is_project_managed_by_user(project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone checklist items for this project.")
        _ensure_parent_unchanged(serializer, "project_milestone")
        serializer.save()

    def perform_destroy(self, instance):
        if not is_project_managed_by_user(instance.project_milestone.project, self.request.user):
            raise PermissionDenied("You do not have permission to manage milestone checklist items for this project.")
        instance.delete()
