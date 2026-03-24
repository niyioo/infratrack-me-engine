from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from apps.projects.models import Project, ProjectAssignment
from apps.projects.serializers import (
    ProjectSerializer,
    ProjectCreateUpdateSerializer,
    ProjectAssignmentSerializer,
)
from apps.projects.services import ProjectService
from apps.common.permissions import IsProjectVisibleToUser


class ProjectViewSet(viewsets.ModelViewSet):
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

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ProjectCreateUpdateSerializer
        return ProjectSerializer

    def get_queryset(self):
        """
        Restrict project visibility based on user role
        """
        user = self.request.user

        if user.is_superuser:
            return super().get_queryset()

        user_roles = set(user.roles.values_list("code", flat=True))

        # High-level roles see all projects
        if user_roles.intersection({"SUPER_ADMIN", "PROGRAM_DIRECTOR", "AUDITOR"}):
            return super().get_queryset()

        # Others see only assigned projects
        return super().get_queryset().filter(
            assignments__user=user,
            assignments__is_active=True
        ).distinct()

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)

        # Automatically assign creator as M&E Officer
        ProjectAssignment.objects.create(
            project=project,
            user=self.request.user,
            assignment_role="M_E_OFFICER",
            assigned_by=self.request.user,
        )

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

        user_id = request.data.get("user_id")
        role = request.data.get("assignment_role")

        if not user_id or not role:
            return Response(
                {"detail": "user_id and assignment_role are required"},
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

        assignment.is_active = False
        assignment.save(update_fields=["is_active"])

        return Response({"detail": "User unassigned successfully"})

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        """
        Change project status (audited)
        """
        project = self.get_object()
        to_status = request.data.get("status")
        reason = request.data.get("reason", "")

        if not to_status:
            return Response(
                {"detail": "status is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectService.change_status(
            project=project,
            to_status=to_status,
            user=request.user,
            reason=reason,
        )

        return Response({"detail": "Project status updated"})