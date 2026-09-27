from django.contrib.gis.db import models
from apps.common.constants import (
    ProjectPriority,
    ProjectStatus,
    ReportingFrequency,
    RiskStatus,
)


class Project(models.Model):
    project_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    agency = models.ForeignKey(
        "organizations.Agency", on_delete=models.PROTECT, related_name="projects"
    )
    contractor = models.ForeignKey(
        "organizations.Contractor", on_delete=models.PROTECT, related_name="projects"
    )
    supervising_department = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    priority = models.CharField(
        max_length=20, choices=ProjectPriority.choices, default=ProjectPriority.MEDIUM
    )
    project_owner = models.CharField(max_length=255, blank=True)
    supervising_officer = models.CharField(max_length=255, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100)
    lga = models.CharField(max_length=100)
    ward = models.CharField(max_length=100, blank=True)
    site_address = models.TextField()
    site_location = models.PointField(geography=True)
    geo_fence_radius_meters = models.PositiveIntegerField(default=50)
    budget_amount = models.DecimalField(max_digits=16, decimal_places=2)
    initial_disbursement_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="NGN")
    funding_source = models.CharField(max_length=255, blank=True)
    funding_cycle = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    expected_end_date = models.DateField()
    actual_end_date = models.DateField(null=True, blank=True)
    reporting_frequency = models.CharField(
        max_length=20, choices=ReportingFrequency.choices, default=ReportingFrequency.MONTHLY
    )
    current_status = models.CharField(
        max_length=50, choices=ProjectStatus.choices, default=ProjectStatus.NOT_STARTED
    )
    risk_status = models.CharField(
        max_length=20, choices=RiskStatus.choices, default=RiskStatus.LOW
    )
    requires_independent_validation = models.BooleanField(default=True)
    inspection_required = models.BooleanField(default=True)
    evidence_required = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="created_projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.project_code} - {self.title}"


class ProjectAssignment(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="assignments")
    assignment_role = models.CharField(max_length=50)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="project_assignments_made"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("project", "user", "assignment_role")


class ProjectStatusHistory(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ProjectLifecycleEvent(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="lifecycle_events")
    stage = models.CharField(max_length=50)
    event_type = models.CharField(max_length=50, default="ENTERED_STAGE")
    source_status = models.CharField(max_length=50, blank=True)
    note = models.TextField(blank=True)
    metadata_json = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
