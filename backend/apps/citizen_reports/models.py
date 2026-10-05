import uuid

from django.db import models


class CitizenReportCategory(models.TextChoices):
    NO_ACTIVITY = "NO_ACTIVITY", "No work happening on site"
    ABANDONED = "ABANDONED", "Project appears abandoned"
    POOR_QUALITY = "POOR_QUALITY", "Poor quality work or materials"
    SAFETY_HAZARD = "SAFETY_HAZARD", "Safety hazard to the public"
    NOT_AS_ANNOUNCED = "NOT_AS_ANNOUNCED", "Work doesn't match what was announced"
    SUSPECTED_FRAUD = "SUSPECTED_FRAUD", "Suspected corruption or fraud"
    PROGRESS_UPDATE = "PROGRESS_UPDATE", "Positive progress update"
    OTHER = "OTHER", "Other concern"


# Categories that count towards automatic risk escalation.
CONCERN_CATEGORIES = [c for c in CitizenReportCategory.values if c != CitizenReportCategory.PROGRESS_UPDATE]


class CitizenReportStatus(models.TextChoices):
    NEW = "NEW", "New"
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    FIELD_VISIT_REQUESTED = "FIELD_VISIT_REQUESTED", "Field visit requested"
    ESCALATED = "ESCALATED", "Escalated"
    RESOLVED = "RESOLVED", "Resolved"
    DISMISSED = "DISMISSED", "Dismissed"


# What the anonymous reporter sees when tracking their report.
PUBLIC_STATUS_LABELS = {
    CitizenReportStatus.NEW: "Received",
    CitizenReportStatus.UNDER_REVIEW: "Under review",
    CitizenReportStatus.FIELD_VISIT_REQUESTED: "Site visit scheduled",
    CitizenReportStatus.ESCALATED: "Escalated for investigation",
    CitizenReportStatus.RESOLVED: "Resolved",
    CitizenReportStatus.DISMISSED: "Closed",
}


def citizen_report_photo_path(instance, filename):
    # Random names: photos are served from MEDIA without auth, so URLs must be unguessable.
    return f"citizen_reports/{uuid.uuid4().hex}.jpg"


class CitizenReport(models.Model):
    tracking_code = models.CharField(max_length=16, unique=True, editable=False)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="citizen_reports")
    category = models.CharField(max_length=30, choices=CitizenReportCategory.choices)
    description = models.TextField()
    observed_on = models.DateField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField(upload_to=citizen_report_photo_path, null=True, blank=True)
    status = models.CharField(max_length=30, choices=CitizenReportStatus.choices, default=CitizenReportStatus.NEW)
    # Keyed hash of the client IP. Used only to count distinct reporters and rate-limit;
    # never exposed through any API, and not reversible without SECRET_KEY.
    reporter_fingerprint = models.CharField(max_length=64, db_index=True, editable=False)
    # Random key the client generates once per report form, so a retry after a lost
    # response returns this report instead of creating a duplicate. Not linked to
    # the reporter in any way.
    client_key = models.CharField(max_length=64, blank=True, default="", editable=False)
    triaged_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="triaged_citizen_reports"
    )
    triaged_at = models.DateTimeField(null=True, blank=True)
    triage_note = models.TextField(blank=True)
    public_response = models.TextField(blank=True)
    fraud_flag = models.ForeignKey(
        "qa.FraudFlag", on_delete=models.SET_NULL, null=True, blank=True, related_name="citizen_reports"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "created_at"], name="citizen_report_proj_created")]
        constraints = [
            models.UniqueConstraint(
                fields=["client_key"],
                condition=~models.Q(client_key=""),
                name="citizen_report_unique_client_key",
            )
        ]

    def __str__(self):
        return f"{self.tracking_code} ({self.get_category_display()})"
