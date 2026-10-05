from rest_framework import serializers
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog


class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor_user.full_name", read_only=True)
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    milestone_name = serializers.CharField(source="milestone.name", read_only=True)
    tranche_name = serializers.CharField(source="tranche.tranche_name", read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "event_type",
            "actor_name",
            "actor_role",
            "project",
            "project_code",
            "project_title",
            "milestone",
            "milestone_name",
            "tranche",
            "tranche_name",
            "object_type",
            "object_id",
            "action",
            "before_state_json",
            "after_state_json",
            "metadata_json",
            "created_at",
        ]


class IntegrityCheckLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrityCheckLog
        fields = ["id", "evidence_file", "check_type", "result", "checked_at"]


class SuspiciousActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)

    class Meta:
        model = SuspiciousActivityLog
        fields = [
            "id",
            "project",
            "project_code",
            "project_title",
            "user",
            "user_name",
            "submission",
            "activity_type",
            "severity",
            "details_json",
            "status",
            "created_at",
        ]
