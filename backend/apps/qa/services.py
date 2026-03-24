from django.db import transaction
from django.utils import timezone
from apps.common.constants import QAReviewDecision, MilestoneStatus, SubmissionStatus
from apps.qa.models import QAReview, QAReviewItem, FraudFlag
from apps.audits.services import AuditService


class QAService:
    @staticmethod
    @transaction.atomic
    def review_submission(*, reviewer, submission, decision, comments, item_scores):
        milestone = submission.milestone
        checklist_items = milestone.checklist_items.all()

        review = QAReview.objects.create(
            project=submission.project,
            milestone=milestone,
            evidence_submission=submission,
            reviewer=reviewer,
            decision=decision,
            comments=comments,
        )

        total_score = 0
        max_score = 0

        score_map = {item["checklist_item_id"]: item for item in item_scores}

        for checklist_item in checklist_items:
            awarded = score_map.get(checklist_item.id, {}).get("score_awarded", 0)
            passed = awarded >= checklist_item.max_score if checklist_item.is_required else awarded > 0
            QAReviewItem.objects.create(
                qa_review=review,
                checklist_item=checklist_item,
                score_awarded=awarded,
                passed=passed,
                comment=score_map.get(checklist_item.id, {}).get("comment", ""),
            )
            total_score += awarded
            max_score += checklist_item.max_score

        review.total_score = total_score
        review.max_score = max_score
        review.rework_required = decision == QAReviewDecision.REWORK_REQUIRED
        review.fraud_suspected = decision == QAReviewDecision.FLAGGED
        review.save(update_fields=["total_score", "max_score", "rework_required", "fraud_suspected"])

        if decision == QAReviewDecision.APPROVED:
            milestone.current_status = MilestoneStatus.APPROVED
            milestone.completed_date = timezone.now().date()
            submission.submission_status = SubmissionStatus.APPROVED
        elif decision == QAReviewDecision.REJECTED:
            milestone.current_status = MilestoneStatus.REJECTED
            submission.submission_status = SubmissionStatus.REJECTED
        elif decision == QAReviewDecision.REWORK_REQUIRED:
            milestone.current_status = MilestoneStatus.REWORK_REQUIRED
            submission.submission_status = SubmissionStatus.REWORK_REQUIRED
        elif decision == QAReviewDecision.FLAGGED:
            milestone.current_status = MilestoneStatus.FLAGGED
            submission.submission_status = SubmissionStatus.FLAGGED
            FraudFlag.objects.create(
                project=submission.project,
                milestone=milestone,
                evidence_submission=submission,
                flagged_by=reviewer,
                flag_type="QA_FLAGGED_SUBMISSION",
                severity="HIGH",
                description=comments or "QA flagged submission during review.",
            )

        milestone.save(update_fields=["current_status", "completed_date", "updated_at"])
        submission.save(update_fields=["submission_status", "updated_at"])

        AuditService.log_event(
            event_type="QA_REVIEW_COMPLETED",
            actor=reviewer,
            project=submission.project,
            milestone=milestone,
            action="qa_review",
            object_type="QAReview",
            object_id=str(review.id),
            metadata={
                "decision": decision,
                "total_score": total_score,
                "max_score": max_score,
            },
        )

        return review