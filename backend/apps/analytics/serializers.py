from rest_framework import serializers
from apps.analytics.models import PortfolioMetricSnapshot, ProjectMetricSnapshot
from apps.analytics.services import AnalyticsService


class ProjectMetricSnapshotSerializer(serializers.ModelSerializer):
    health_score = serializers.SerializerMethodField()
    health_band = serializers.SerializerMethodField()
    alerts = serializers.SerializerMethodField()
    lifecycle_stage = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMetricSnapshot
        fields = "__all__"

    def get_health_score(self, obj):
        return AnalyticsService.calculate_health_score(
            physical_completion_percent=obj.physical_completion_percent,
            financial_disbursement_percent=obj.financial_disbursement_percent,
            delayed_days=obj.delayed_days,
            flagged_count=obj.flagged_count,
            expected_progress_percent=AnalyticsService.expected_progress_percent(obj.project, as_of=obj.snapshot_date),
        )

    def get_health_band(self, obj):
        return AnalyticsService.health_band(self.get_health_score(obj))

    def get_alerts(self, obj):
        return AnalyticsService.build_project_alerts(
            obj.project,
            {
                "physical_completion_percent": obj.physical_completion_percent,
                "financial_disbursement_percent": obj.financial_disbursement_percent,
                "delayed_days": obj.delayed_days,
                "flagged_count": obj.flagged_count,
            },
        )

    def get_lifecycle_stage(self, obj):
        return AnalyticsService.project_lifecycle_stage(obj.project)


class PortfolioMetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioMetricSnapshot
        fields = "__all__"


class DashboardAlertSummarySerializer(serializers.Serializer):
    delayed_milestones = serializers.IntegerField()
    unresolved_fraud_flags = serializers.IntegerField()
    geofence_exceptions_pending = serializers.IntegerField()


class CitizenReportSummarySerializer(serializers.Serializer):
    open = serializers.IntegerField()
    escalated = serializers.IntegerField()
    new_last_7_days = serializers.IntegerField()


class DashboardProjectSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    project_code = serializers.CharField()
    title = serializers.CharField()
    state = serializers.CharField()
    lga = serializers.CharField()
    site_address = serializers.CharField()
    current_status = serializers.CharField()
    risk_status = serializers.CharField()
    lifecycle_stage = serializers.CharField()
    budget_amount = serializers.CharField()
    requires_independent_validation = serializers.BooleanField()
    expected_end_date = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField()


class DashboardMapProjectSerializer(DashboardProjectSummarySerializer):
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)


class DashboardInterventionProjectSerializer(DashboardProjectSummarySerializer):
    attention_reason = serializers.CharField()
    attention_level = serializers.CharField()
    reporting_frequency = serializers.CharField(allow_blank=True)
    reporting_due_date = serializers.DateField(allow_null=True)
    last_reported_at = serializers.DateTimeField(allow_null=True)
    days_overdue = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    flagged_projects_count = serializers.IntegerField()
    delayed_projects_count = serializers.IntegerField()
    total_budget = serializers.CharField()
    awaiting_verification_count = serializers.IntegerField()
    completed_projects_count = serializers.IntegerField()
    high_risk_projects_count = serializers.IntegerField()
    independent_validation_required_count = serializers.IntegerField()
    alert_summary = DashboardAlertSummarySerializer()
    map_projects = DashboardMapProjectSerializer(many=True)
    flagged_projects = DashboardProjectSummarySerializer(many=True)
    delayed_projects = DashboardProjectSummarySerializer(many=True)
    intervention_queue = DashboardInterventionProjectSerializer(many=True)
    compliance_queue = DashboardInterventionProjectSerializer(many=True)
    recent_projects = DashboardProjectSummarySerializer(many=True)
    latest_snapshots = ProjectMetricSnapshotSerializer(many=True)
    summary_source = serializers.CharField()
    summary_snapshot_date = serializers.DateField(allow_null=True)
    # None for users who can't triage citizen reports.
    citizen_reports = CitizenReportSummarySerializer(allow_null=True, required=False, default=None)
