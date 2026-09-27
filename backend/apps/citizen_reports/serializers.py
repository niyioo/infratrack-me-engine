from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.citizen_reports.models import (
    PUBLIC_STATUS_LABELS,
    CitizenReport,
    CitizenReportCategory,
    CitizenReportStatus,
)
from apps.projects.models import Project

MAX_PHOTO_BYTES = 10 * 1024 * 1024


# ─── public (anonymous) ──────────────────────────────────────────────────────

class PublicProjectSerializer(serializers.ModelSerializer):
    """Deliberately minimal: no budget, contractor, staff or finance data."""

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "project_code",
            "title",
            "category",
            "state",
            "lga",
            "site_address",
            "current_status",
            "latitude",
            "longitude",
        ]

    def get_latitude(self, obj):
        return obj.site_location.y if obj.site_location else None

    def get_longitude(self, obj):
        return obj.site_location.x if obj.site_location else None


class PublicCitizenReportCreateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    category = serializers.ChoiceField(choices=CitizenReportCategory.choices)
    description = serializers.CharField(min_length=20, max_length=2000, trim_whitespace=True)
    observed_on = serializers.DateField(required=False, allow_null=True)
    latitude = serializers.FloatField(required=False, allow_null=True, min_value=-90, max_value=90)
    longitude = serializers.FloatField(required=False, allow_null=True, min_value=-180, max_value=180)
    photo = serializers.FileField(required=False, allow_null=True)
    # Honeypot: hidden in the UI, so only bots fill it in.
    website = serializers.CharField(required=False, allow_blank=True)

    def validate_observed_on(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("The date cannot be in the future.")
        if value and value < timezone.localdate() - timedelta(days=365):
            raise serializers.ValidationError("Please report things observed within the last year.")
        return value

    def validate_photo(self, value):
        if value and value.size > MAX_PHOTO_BYTES:
            raise serializers.ValidationError("Photo must be 10 MB or smaller.")
        return value

    def validate(self, attrs):
        if attrs.get("website"):
            raise serializers.ValidationError("Submission rejected.")
        if (attrs.get("latitude") is None) != (attrs.get("longitude") is None):
            raise serializers.ValidationError({"latitude": "Latitude and longitude must be provided together."})
        return attrs


class PublicCitizenReportStatusSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = CitizenReport
        fields = [
            "tracking_code",
            "project_title",
            "category",
            "category_label",
            "status_label",
            "public_response",
            "created_at",
            "updated_at",
        ]

    def get_status_label(self, obj):
        return PUBLIC_STATUS_LABELS.get(obj.status, "Received")


# ─── staff ───────────────────────────────────────────────────────────────────

class CitizenReportSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    project_risk_status = serializers.CharField(source="project.risk_status", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    triaged_by_name = serializers.CharField(source="triaged_by.full_name", read_only=True, default=None)
    same_source_count = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = CitizenReport
        fields = [
            "id",
            "tracking_code",
            "project",
            "project_code",
            "project_title",
            "project_risk_status",
            "category",
            "category_label",
            "description",
            "observed_on",
            "latitude",
            "longitude",
            "photo",
            "status",
            "triaged_by",
            "triaged_by_name",
            "triaged_at",
            "triage_note",
            "public_response",
            "fraud_flag",
            "same_source_count",
            "created_at",
        ]
        read_only_fields = fields


class CitizenReportTriageSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=CitizenReportStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    public_response = serializers.CharField(required=False, allow_blank=True, default="", max_length=1000)
