from rest_framework import permissions, viewsets
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog
from apps.audits.serializers import (
    AuditEventSerializer,
    IntegrityCheckLogSerializer,
    SuspiciousActivityLogSerializer,
)
from apps.common.permissions import (
    AUDIT_REVIEWER_ROLE_CODES,
    HIGH_PRIVILEGE_ROLE_CODES,
    HasActionCapability,
    get_user_role_codes,
)
from apps.common.pagination import OptionalPaginationMixin


class AuditEventViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditEvent.objects.select_related("actor_user", "project", "milestone", "tranche").all()
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    action_capability_map = {
        "list": ("audits.view",),
        "retrieve": ("audits.view",),
    }
    filterset_fields = ["event_type", "actor_role", "project", "milestone", "tranche"]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(HIGH_PRIVILEGE_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()


class IntegrityCheckLogViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = IntegrityCheckLog.objects.select_related("evidence_file__evidence_submission__project").all()
    serializer_class = IntegrityCheckLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    action_capability_map = {
        "list": ("audits.view",),
        "retrieve": ("audits.view",),
    }
    filterset_fields = ["check_type", "result"]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(AUDIT_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(
            evidence_file__evidence_submission__project__assignments__user=user,
            evidence_file__evidence_submission__project__assignments__is_active=True,
        ).distinct()


class SuspiciousActivityLogViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = SuspiciousActivityLog.objects.select_related("project", "user", "submission").all()
    serializer_class = SuspiciousActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    action_capability_map = {
        "list": ("audits.view",),
        "retrieve": ("audits.view",),
    }
    filterset_fields = ["activity_type", "severity", "status", "project", "user"]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(AUDIT_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()
