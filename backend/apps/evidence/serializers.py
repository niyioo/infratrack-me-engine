import os
from datetime import timedelta

from rest_framework import serializers
from django.utils import timezone
from apps.common.constants import SourceType
from apps.evidence.models import EvidenceSubmission, EvidenceFile, GeoFenceExceptionRequest

MAX_FILES_PER_SUBMISSION = 10
MAX_EVIDENCE_FILE_BYTES = 15 * 1024 * 1024
ALLOWED_EVIDENCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
ALLOWED_EVIDENCE_MIME_TYPES = {"image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"}


class EvidenceFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceFile
        fields = [
            "id",
            "file",
            "file_type",
            "original_filename",
            "mime_type",
            "file_size_bytes",
            "captured_at",
            "latitude",
            "longitude",
            "altitude",
            "accuracy_meters",
            "bearing",
            "is_primary",
            "created_at",
        ]


class EvidenceSubmissionSerializer(serializers.ModelSerializer):
    files = EvidenceFileSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by_user.full_name", read_only=True)
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    milestone_name = serializers.CharField(source="milestone.name", read_only=True)
    file_count = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceSubmission
        fields = [
            "id",
            "project",
            "milestone",
            "submitted_by_user",
            "submitted_by_name",
            "project_code",
            "project_title",
            "milestone_name",
            "submitted_by_actor_type",
            "source_type",
            "submission_status",
            "notes",
            "idempotency_key",
            "submitted_at",
            "capture_mode",
            "offline_created_at",
            "synced_at",
            "geo_validation_status",
            "integrity_status",
            "requires_exception_review",
            "created_at",
            "updated_at",
            "file_count",
            "files",
        ]

    def get_file_count(self, obj):
        return obj.files.count()


class EvidenceSubmissionCreateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    milestone_id = serializers.IntegerField()
    source_type = serializers.ChoiceField(choices=SourceType.choices)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=128)
    notes = serializers.CharField(required=False, allow_blank=True)
    exception_reason = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_platform = serializers.CharField(required=False, allow_blank=True)
    device_app_version = serializers.CharField(required=False, allow_blank=True)
    capture_mode = serializers.CharField(required=False, allow_blank=True, max_length=50)
    offline_created_at = serializers.DateTimeField(required=False)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    captured_at = serializers.DateTimeField(required=False)
    accuracy_meters = serializers.FloatField(required=False, min_value=0)
    altitude = serializers.FloatField(required=False)
    bearing = serializers.FloatField(required=False, min_value=0, max_value=360)
    files = serializers.ListField(child=serializers.FileField(), allow_empty=False, max_length=MAX_FILES_PER_SUBMISSION)

    def validate_files(self, files):
        for uploaded in files:
            if uploaded.size > MAX_EVIDENCE_FILE_BYTES:
                raise serializers.ValidationError(
                    f"{uploaded.name} exceeds the {MAX_EVIDENCE_FILE_BYTES // (1024 * 1024)} MB limit."
                )
            extension = os.path.splitext(uploaded.name or "")[1].lower()
            content_type = (getattr(uploaded, "content_type", "") or "").lower()
            if extension not in ALLOWED_EVIDENCE_EXTENSIONS or content_type not in ALLOWED_EVIDENCE_MIME_TYPES:
                raise serializers.ValidationError(f"{uploaded.name} is not an accepted photo format.")
        return files

    def validate_captured_at(self, value):
        if value > timezone.now() + timedelta(minutes=5):
            raise serializers.ValidationError("Captured time cannot be materially in the future.")
        return value

    def validate_offline_created_at(self, value):
        if value > timezone.now() + timedelta(minutes=5):
            raise serializers.ValidationError("Offline created time cannot be materially in the future.")
        return value


class GeoFenceExceptionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeoFenceExceptionRequest
        fields = [
            "id",
            "project",
            "milestone",
            "submission",
            "requested_by",
            "current_latitude",
            "current_longitude",
            "distance_from_site_meters",
            "reason",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
        ]
        read_only_fields = ["requested_by", "reviewed_by", "reviewed_at", "status"]


class GeoFenceExceptionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeoFenceExceptionRequest
        fields = [
            "project",
            "milestone",
            "submission",
            "current_latitude",
            "current_longitude",
            "distance_from_site_meters",
            "reason",
        ]
        # Computed server-side from the reported coordinates.
        read_only_fields = ["distance_from_site_meters"]


class GeoFenceExceptionReviewSerializer(serializers.Serializer):
    decision_note = serializers.CharField(required=False, allow_blank=True)
