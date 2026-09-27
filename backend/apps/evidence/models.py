from django.db import models
from apps.common.constants import SubmissionStatus, SourceType, GeoValidationStatus


class EvidenceSubmission(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="evidence_submissions")
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.CASCADE, related_name="submissions")
    submitted_by_user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="evidence_submissions"
    )
    submitted_by_actor_type = models.CharField(max_length=50)
    source_type = models.CharField(max_length=30, choices=SourceType.choices)
    submission_status = models.CharField(
        max_length=30, choices=SubmissionStatus.choices, default=SubmissionStatus.DRAFT
    )
    notes = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=128, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    device_id = models.CharField(max_length=255, blank=True)
    device_platform = models.CharField(max_length=50, blank=True)
    capture_mode = models.CharField(max_length=50, default="LIVE_IN_APP")
    offline_created_at = models.DateTimeField(null=True, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    geo_validation_status = models.CharField(
        max_length=30, choices=GeoValidationStatus.choices, default=GeoValidationStatus.PENDING
    )
    integrity_status = models.CharField(max_length=30, default="PENDING")
    requires_exception_review = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["submitted_by_user", "idempotency_key"],
                condition=models.Q(idempotency_key__gt=""),
                name="uniq_evid_idem_per_user",
            ),
        ]
        indexes = [
            models.Index(fields=["project", "milestone", "-created_at"], name="evid_proj_mst_cr_idx"),
            models.Index(fields=["submitted_by_user", "idempotency_key"], name="evid_submit_idem_idx"),
        ]


def evidence_upload_path(instance, filename):
    return f"evidence/project_{instance.evidence_submission.project_id}/milestone_{instance.evidence_submission.milestone_id}/{filename}"


class EvidenceFile(models.Model):
    evidence_submission = models.ForeignKey(
        EvidenceSubmission, on_delete=models.CASCADE, related_name="files"
    )
    file = models.FileField(upload_to=evidence_upload_path)
    file_type = models.CharField(max_length=30)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size_bytes = models.BigIntegerField()
    sha256_hash = models.CharField(max_length=128)
    perceptual_hash = models.CharField(max_length=128, blank=True)
    captured_at = models.DateTimeField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    accuracy_meters = models.FloatField(null=True, blank=True)
    bearing = models.FloatField(null=True, blank=True)
    metadata_json = models.JSONField(default=dict, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class CaptureAttempt(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.CASCADE)
    attempt_time = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    distance_from_site_meters = models.FloatField()
    within_geofence = models.BooleanField(default=False)
    result = models.CharField(max_length=30)
    reason_code = models.CharField(max_length=100, blank=True)
    device_metadata_json = models.JSONField(default=dict, blank=True)


class GeoFenceExceptionRequest(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.CASCADE)
    submission = models.ForeignKey(EvidenceSubmission, on_delete=models.SET_NULL, null=True, blank=True)
    requested_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    current_latitude = models.FloatField()
    current_longitude = models.FloatField()
    distance_from_site_meters = models.FloatField()
    reason = models.TextField()
    status = models.CharField(max_length=30, default="PENDING")
    reviewed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_geofence_exceptions"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
