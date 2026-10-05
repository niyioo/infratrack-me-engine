from django.db import models


class ProjectMetricSnapshot(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="metric_snapshots")
    snapshot_date = models.DateField()
    physical_completion_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    financial_disbursement_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    burn_variance_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    delayed_days = models.IntegerField(default=0)
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    flagged_count = models.PositiveIntegerField(default=0)
    approved_milestones = models.PositiveIntegerField(default=0)
    total_milestones = models.PositiveIntegerField(default=0)


class PortfolioMetricSnapshot(models.Model):
    snapshot_date = models.DateField()
    scope_type = models.CharField(max_length=20, default="GLOBAL")
    state = models.CharField(max_length=100, blank=True)
    lga = models.CharField(max_length=100, blank=True)
    total_projects = models.PositiveIntegerField(default=0)
    active_projects = models.PositiveIntegerField(default=0)
    flagged_projects_count = models.PositiveIntegerField(default=0)
    delayed_projects_count = models.PositiveIntegerField(default=0)
    total_budget = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    awaiting_verification_count = models.PositiveIntegerField(default=0)
    completed_projects_count = models.PositiveIntegerField(default=0)
    high_risk_projects_count = models.PositiveIntegerField(default=0)
    independent_validation_required_count = models.PositiveIntegerField(default=0)
    delayed_milestones_count = models.PositiveIntegerField(default=0)
    unresolved_fraud_flags_count = models.PositiveIntegerField(default=0)
    geofence_exceptions_pending_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["snapshot_date", "scope_type", "state", "lga"],
                name="analytics_unique_portfolio_snapshot_scope",
            )
        ]
