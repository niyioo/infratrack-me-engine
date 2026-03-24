from rest_framework import viewsets
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog
from apps.audits.serializers import (
    AuditEventSerializer,
    IntegrityCheckLogSerializer,
    SuspiciousActivityLogSerializer,
)


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditEvent.objects.all()
    serializer_class = AuditEventSerializer
    filterset_fields = ["event_type", "actor_role", "project", "milestone", "tranche"]


class IntegrityCheckLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IntegrityCheckLog.objects.all()
    serializer_class = IntegrityCheckLogSerializer
    filterset_fields = ["check_type", "result"]


class SuspiciousActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SuspiciousActivityLog.objects.all()
    serializer_class = SuspiciousActivityLogSerializer
    filterset_fields = ["activity_type", "severity", "status", "project", "user"]