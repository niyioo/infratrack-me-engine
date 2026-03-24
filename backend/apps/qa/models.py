from django.db import models
from apps.common.constants import QAReviewDecision


class QAReview(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="qa_reviews")
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.CASCADE, related_name="qa_reviews")
    evidence_submission = models.ForeignKey("evidence.EvidenceSubmission", on_delete=models.CASCADE, related_name="qa_reviews")
    reviewer = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="qa_reviews")
    review_stage = models.CharField(max_length=50, default="PRIMARY")
    decision = models.CharField(max_length=30, choices=QAReviewDecision.choices)
    total_score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    comments = models.TextField(blank=True)
    fraud_suspected = models.BooleanField(default=False)
    rework_required = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)


class QAReviewItem(models.Model):
    qa_review = models.ForeignKey(QAReview, on_delete=models.CASCADE, related_name="items")
    checklist_item = models.ForeignKey("milestones.MilestoneChecklistItem", on_delete=models.CASCADE)
    score_awarded = models.PositiveIntegerField(default=0)
    passed = models.BooleanField(default=False)
    comment = models.TextField(blank=True)


class FraudFlag(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="fraud_flags")
    milestone = models.ForeignKey("milestones.ProjectMilestone", on_delete=models.SET_NULL, null=True, blank=True)
    evidence_submission = models.ForeignKey("evidence.EvidenceSubmission", on_delete=models.SET_NULL, null=True, blank=True)
    flagged_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    flag_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, default="MEDIUM")
    description = models.TextField()
    status = models.CharField(max_length=30, default="OPEN")
    resolved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_fraud_flags"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)