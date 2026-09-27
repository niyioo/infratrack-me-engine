from rest_framework import serializers
from django.utils import timezone
from apps.projects.models import Project, ProjectAssignment, ProjectLifecycleEvent, ProjectStatusHistory
from apps.organizations.serializers import AgencySerializer, ContractorSerializer
from apps.analytics.services import AnalyticsService
from apps.common.constants import MilestoneStatus

# Beyond this the geo-fence stops meaningfully proving on-site capture.
MAX_GEOFENCE_RADIUS_METERS = 5000


class ProjectAlertSerializer(serializers.Serializer):
    code = serializers.CharField()
    severity = serializers.CharField()
    message = serializers.CharField()


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ProjectAssignment
        fields = ["id", "user", "user_name", "assignment_role", "assigned_at", "is_active"]


class ProjectStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = ProjectStatusHistory
        fields = "__all__"


class ProjectLifecycleEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = ProjectLifecycleEvent
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    contractor = ContractorSerializer(read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    lifecycle_stage = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "project_code", "title", "description", "agency", "contractor",
            "supervising_department", "category", "priority", "project_owner",
            "supervising_officer", "sector", "state", "lga", "ward",
            "site_address", "latitude", "longitude", "geo_fence_radius_meters",
            "budget_amount", "initial_disbursement_amount", "currency",
            "funding_source", "funding_cycle", "start_date",
            "expected_end_date", "actual_end_date", "current_status",
            "reporting_frequency", "risk_status", "requires_independent_validation",
            "inspection_required", "evidence_required", "notes", "created_at",
            "lifecycle_stage",
        ]

    def get_latitude(self, obj):
        return obj.site_location.y if obj.site_location else None

    def get_longitude(self, obj):
        return obj.site_location.x if obj.site_location else None

    def get_lifecycle_stage(self, obj):
        return AnalyticsService.project_lifecycle_stage(obj)


class ProjectDetailSerializer(ProjectSerializer):
    health_score = serializers.SerializerMethodField()
    health_band = serializers.SerializerMethodField()
    alerts = serializers.SerializerMethodField()
    physical_completion_percent = serializers.SerializerMethodField()
    financial_disbursement_percent = serializers.SerializerMethodField()
    burn_variance_percent = serializers.SerializerMethodField()
    delayed_days = serializers.SerializerMethodField()
    total_milestones = serializers.SerializerMethodField()
    approved_milestones = serializers.SerializerMethodField()
    overdue_milestones = serializers.SerializerMethodField()
    evidence_submissions_count = serializers.SerializerMethodField()
    open_fraud_flags = serializers.SerializerMethodField()
    pending_geofence_exceptions = serializers.SerializerMethodField()
    reporting_attention_reason = serializers.SerializerMethodField()
    reporting_attention_level = serializers.SerializerMethodField()
    reporting_due_date = serializers.SerializerMethodField()
    last_reported_at = serializers.SerializerMethodField()
    reporting_days_overdue = serializers.SerializerMethodField()

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + [
            "health_score",
            "health_band",
            "alerts",
            "physical_completion_percent",
            "financial_disbursement_percent",
            "burn_variance_percent",
            "delayed_days",
            "total_milestones",
            "approved_milestones",
            "overdue_milestones",
            "evidence_submissions_count",
            "open_fraud_flags",
            "pending_geofence_exceptions",
            "reporting_attention_reason",
            "reporting_attention_level",
            "reporting_due_date",
            "last_reported_at",
            "reporting_days_overdue",
        ]

    def _snapshot_values(self, obj):
        snapshot_values = getattr(obj, "_operational_snapshot_values", None)
        if snapshot_values is None:
            snapshot_values = AnalyticsService._calculate_snapshot_values(obj)
            obj._operational_snapshot_values = snapshot_values
        return snapshot_values

    def get_health_score(self, obj):
        values = self._snapshot_values(obj)
        return AnalyticsService.calculate_health_score(
            physical_completion_percent=values["physical_completion_percent"],
            financial_disbursement_percent=values["financial_disbursement_percent"],
            delayed_days=values["delayed_days"],
            flagged_count=values["flagged_count"],
        )

    def get_health_band(self, obj):
        return AnalyticsService.health_band(self.get_health_score(obj))

    def get_alerts(self, obj):
        return AnalyticsService.build_project_alerts(obj, snapshot_values=self._snapshot_values(obj))

    def get_physical_completion_percent(self, obj):
        return self._snapshot_values(obj)["physical_completion_percent"]

    def get_financial_disbursement_percent(self, obj):
        return self._snapshot_values(obj)["financial_disbursement_percent"]

    def get_burn_variance_percent(self, obj):
        return self._snapshot_values(obj)["burn_variance_percent"]

    def get_delayed_days(self, obj):
        return self._snapshot_values(obj)["delayed_days"]

    def get_total_milestones(self, obj):
        return self._snapshot_values(obj)["total_milestones"]

    def get_approved_milestones(self, obj):
        return self._snapshot_values(obj)["approved_milestones"]

    def get_overdue_milestones(self, obj):
        return obj.milestones.exclude(current_status=MilestoneStatus.APPROVED).filter(
            due_date__lt=timezone.now().date()
        ).count()

    def get_evidence_submissions_count(self, obj):
        return obj.evidence_submissions.count()

    def get_open_fraud_flags(self, obj):
        return obj.fraud_flags.filter(status="OPEN").count()

    def get_pending_geofence_exceptions(self, obj):
        return obj.geofenceexceptionrequest_set.filter(status="PENDING").count()

    def _reporting_compliance(self, obj):
        compliance = getattr(obj, "_reporting_compliance_cache", None)
        if compliance is None:
            compliance = AnalyticsService.reporting_compliance(obj) or {}
            obj._reporting_compliance_cache = compliance
        return compliance

    def get_reporting_attention_reason(self, obj):
        return self._reporting_compliance(obj).get("attention_reason")

    def get_reporting_attention_level(self, obj):
        return self._reporting_compliance(obj).get("attention_level")

    def get_reporting_due_date(self, obj):
        return self._reporting_compliance(obj).get("reporting_due_date")

    def get_last_reported_at(self, obj):
        return self._reporting_compliance(obj).get("last_reported_at")

    def get_reporting_days_overdue(self, obj):
        return self._reporting_compliance(obj).get("days_overdue", 0)


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, min_value=-90, max_value=90)
    longitude = serializers.FloatField(write_only=True, min_value=-180, max_value=180)

    class Meta:
        model = Project
        exclude = ("site_location", "created_by",)

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        expected_end_date = attrs.get("expected_end_date", getattr(self.instance, "expected_end_date", None))
        actual_end_date = attrs.get("actual_end_date", getattr(self.instance, "actual_end_date", None))
        budget_amount = attrs.get("budget_amount", getattr(self.instance, "budget_amount", None))
        initial_disbursement_amount = attrs.get(
            "initial_disbursement_amount",
            getattr(self.instance, "initial_disbursement_amount", None),
        )
        geo_fence_radius_meters = attrs.get(
            "geo_fence_radius_meters",
            getattr(self.instance, "geo_fence_radius_meters", None),
        )
        latitude = attrs.get("latitude")
        longitude = attrs.get("longitude")

        if start_date and expected_end_date and expected_end_date < start_date:
            raise serializers.ValidationError(
                {"expected_end_date": "Expected end date cannot be earlier than start date."}
            )

        if start_date and actual_end_date and actual_end_date < start_date:
            raise serializers.ValidationError(
                {"actual_end_date": "Actual end date cannot be earlier than start date."}
            )

        if budget_amount is not None and budget_amount < 0:
            raise serializers.ValidationError({"budget_amount": "Budget amount cannot be negative."})

        if initial_disbursement_amount is not None and initial_disbursement_amount < 0:
            raise serializers.ValidationError(
                {"initial_disbursement_amount": "Initial disbursement cannot be negative."}
            )

        if (
            budget_amount is not None
            and initial_disbursement_amount is not None
            and initial_disbursement_amount > budget_amount
        ):
            raise serializers.ValidationError(
                {"initial_disbursement_amount": "Initial disbursement cannot exceed the approved budget."}
            )

        if geo_fence_radius_meters is not None and geo_fence_radius_meters <= 0:
            raise serializers.ValidationError(
                {"geo_fence_radius_meters": "Geo-fence radius must be greater than zero."}
            )

        if geo_fence_radius_meters is not None and geo_fence_radius_meters > MAX_GEOFENCE_RADIUS_METERS:
            raise serializers.ValidationError(
                {"geo_fence_radius_meters": f"Geo-fence radius cannot exceed {MAX_GEOFENCE_RADIUS_METERS} meters."}
            )

        if (latitude is None) ^ (longitude is None):
            raise serializers.ValidationError(
                {"latitude": "Latitude and longitude must be provided together."}
            )

        for key in [
            "project_code",
            "title",
            "description",
            "supervising_department",
            "category",
            "project_owner",
            "supervising_officer",
            "sector",
            "state",
            "lga",
            "ward",
            "site_address",
            "currency",
            "funding_source",
            "funding_cycle",
            "notes",
        ]:
            if key in attrs and isinstance(attrs[key], str):
                attrs[key] = attrs[key].strip()

        return attrs

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop("latitude")
        lng = validated_data.pop("longitude")
        validated_data["site_location"] = Point(lng, lat, srid=4326)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None and lng is not None:
            instance.site_location = Point(lng, lat, srid=4326)
        return super().update(instance, validated_data)
