from django.db import models


class AuditEvent(models.Model):
    event_type = models.CharField(max_length=100)
    actor_user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events"
    )
    actor_role = models.CharField(max_length=100, blank=True)
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True)
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.SET_NULL, null=True, blank=True)
    tranche = models.ForeignKey("finance.FundingTranche", on_delete=models.SET_NULL, null=True, blank=True)
    object_type = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    before_state_json = models.JSONField(null=True, blank=True)
    after_state_json = models.JSONField(null=True, blank=True)
    metadata_json = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class IntegrityCheckLog(models.Model):
    evidence_file = models.ForeignKey("evidence.EvidenceFile", on_delete=models.CASCADE, related_name="integrity_logs")
    check_type = models.CharField(max_length=100)
    result = models.CharField(max_length=30)
    details_json = models.JSONField(default=dict, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)


class SuspiciousActivityLog(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    submission = models.ForeignKey("evidence.EvidenceSubmission", on_delete=models.SET_NULL, null=True, blank=True)
    activity_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20)
    details_json = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, default="OPEN")
    created_at = models.DateTimeField(auto_now_add=True)