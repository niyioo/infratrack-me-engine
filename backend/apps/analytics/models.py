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