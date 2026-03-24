from rest_framework import serializers
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = "__all__"


class IntegrityCheckLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrityCheckLog
        fields = "__all__"


class SuspiciousActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuspiciousActivityLog
        fields = "__all__"