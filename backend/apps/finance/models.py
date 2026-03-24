from django.db import models
from apps.common.constants import TrancheStatus


class FundingTranche(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="tranches")
    tranche_number = models.PositiveIntegerField()
    tranche_name = models.CharField(max_length=255)
    planned_amount = models.DecimalField(max_digits=16, decimal_places=2)
    percentage_of_budget = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    planned_release_date = models.DateField(null=True, blank=True)
    actual_release_date = models.DateField(null=True, blank=True)
    current_status = models.CharField(
        max_length=30, choices=TrancheStatus.choices, default=TrancheStatus.LOCKED
    )
    unlock_status = models.CharField(max_length=30, default="LOCKED")
    unlock_reason = models.TextField(blank=True)
    released_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    release_reference = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "tranche_number")
        ordering = ["tranche_number"]


class TrancheEligibilitySnapshot(models.Model):
    tranche = models.ForeignKey(FundingTranche, on_delete=models.CASCADE, related_name="eligibility_snapshots")
    evaluated_at = models.DateTimeField(auto_now_add=True)
    is_eligible = models.BooleanField(default=False)
    rules_passed_json = models.JSONField(default=list)
    rules_failed_json = models.JSONField(default=list)
    evaluated_by_system = models.BooleanField(default=True)
    snapshot_hash = models.CharField(max_length=128)


class Disbursement(models.Model):
    tranche = models.ForeignKey(FundingTranche, on_delete=models.CASCADE, related_name="disbursements")
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="disbursements")
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    released_by_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="disbursements_made")
    authorized_by_user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="disbursements_authorized"
    )
    release_date = models.DateTimeField(auto_now_add=True)
    payment_reference = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    source_of_authority = models.CharField(max_length=100, default="SYSTEM_ELIGIBLE")


class ManualOverrideRequest(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="override_requests")
    tranche = models.ForeignKey(FundingTranche, on_delete=models.SET_NULL, null=True, blank=True, related_name="override_requests")
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.SET_NULL, null=True, blank=True)
    requested_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    reason = models.TextField()
    supporting_document_path = models.CharField(max_length=500, blank=True)
    current_status = models.CharField(max_length=30, default="PENDING")
    risk_acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ManualOverrideApproval(models.Model):
    override_request = models.ForeignKey(
        ManualOverrideRequest, on_delete=models.CASCADE, related_name="approvals"
    )
    approver = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    decision = models.CharField(max_length=30)
    comment = models.TextField(blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)