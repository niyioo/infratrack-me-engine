from django.db import transaction
from django.utils import timezone
from apps.common.constants import QAReviewDecision, MilestoneStatus, SubmissionStatus
from apps.evidence.models import EvidenceSubmission
from apps.qa.models import QAReview, QAReviewItem, FraudFlag
from apps.audits.services import AuditService
from apps.projects.services import ProjectService


class QAReviewError(ValueError):
    pass


class FraudFlagError(ValueError):
    pass


FRAUD_FLAG_RESOLUTIONS = {
    # Confirmed problem that has been dealt with (e.g. contractor remediated, funds recovered).
    "RESOLVED",
    # False positive: investigation found no wrongdoing.
    "DISMISSED",
}


class FraudFlagService:
    @staticmethod
    @transaction.atomic
    def resolve(*, flag, user, resolution, note):
        # of=("self",): milestone/evidence are nullable (outer joins), which Postgres can't lock.
        flag = (
            FraudFlag.objects.select_for_update(of=("self",))
            .select_related("project", "milestone", "evidence_submission")
            .get(pk=flag.pk)
        )
        if flag.status != "OPEN":
            raise FraudFlagError("Only open fraud flags can be resolved.")
        if resolution not in FRAUD_FLAG_RESOLUTIONS:
            raise FraudFlagError("Resolution must be RESOLVED or DISMISSED.")
        if not note.strip():
            raise FraudFlagError("A resolution note is required.")
        # Four-eyes: clearing a payment block needs someone other than whoever raised it
        # or whoever submitted the flagged evidence.
        if flag.flagged_by_id == user.id:
            raise FraudFlagError("A fraud flag must be resolved by someone other than the person who raised it.")
        if flag.evidence_submission and flag.evidence_submission.submitted_by_user_id == user.id:
            raise FraudFlagError("You cannot resolve a fraud flag on your own evidence submission.")

        flag.status = resolution
        flag.resolved_by = user
        flag.resolved_at = timezone.now()
        flag.resolution_note = note
        flag.save(update_fields=["status", "resolved_by", "resolved_at", "resolution_note"])

        # A FLAGGED milestone keeps the project FLAGGED on its own. Once no open flags
        # remain on it, send it back for fresh evidence rather than straight to approved:
        # payment still requires new evidence to pass QA.
        milestone = flag.milestone
        if (
            milestone
            and milestone.current_status == MilestoneStatus.FLAGGED
            and not FraudFlag.objects.filter(milestone=milestone, status="OPEN").exists()
        ):
            milestone.current_status = MilestoneStatus.REWORK_REQUIRED
            milestone.save(update_fields=["current_status", "updated_at"])

        # Close any citizen reports that were escalated into this flag.
        for report in flag.citizen_reports.filter(status="ESCALATED"):
            report.status = "RESOLVED"
            report.triaged_by = user
            report.triaged_at = flag.resolved_at
            report.save(update_fields=["status", "triaged_by", "triaged_at", "updated_at"])

        ProjectService.sync_operational_status(
            flag.project,
            user=user,
            reason=f"Fraud flag {flag.id} {resolution.lower()}.",
        )
        AuditService.log_event(
            event_type="FRAUD_FLAG_RESOLVED",
            actor=user,
            project=flag.project,
            milestone=milestone,
            action=resolution,
            object_type="FraudFlag",
            object_id=str(flag.id),
            before_state={"status": "OPEN"},
            after_state={"status": resolution, "resolved_by": user.id},
            metadata={"note": note},
        )
        return flag


class QAService:
    @staticmethod
    @transaction.atomic
    def review_submission(*, reviewer, submission, decision, comments, item_scores):
        # Lock the submission so two reviewers can't record conflicting decisions.
        submission = (
            EvidenceSubmission.objects.select_for_update()
            .select_related("project", "milestone")
            .get(pk=submission.pk)
        )
        if submission.submitted_by_user_id == reviewer.id:
            raise QAReviewError("You cannot review your own evidence submission.")
        if submission.submission_status != SubmissionStatus.SUBMITTED:
            raise QAReviewError(
                f"Only submitted evidence can be reviewed (current status: {submission.submission_status})."
            )
        if submission.requires_exception_review:
            raise QAReviewError("This submission has a pending geo-fence exception that must be resolved first.")
        if QAReview.objects.filter(evidence_submission=submission).exists():
            raise QAReviewError("This submission has already been reviewed.")

        milestone = submission.milestone
        checklist_items = list(milestone.checklist_items.all())
        checklist_by_id = {item.id: item for item in checklist_items}

        for entry in item_scores:
            checklist_item = checklist_by_id.get(entry["checklist_item_id"])
            if checklist_item is None:
                raise QAReviewError(
                    f"Checklist item {entry['checklist_item_id']} does not belong to this milestone."
                )
            if entry["score_awarded"] > checklist_item.max_score:
                raise QAReviewError(
                    f"Score for '{checklist_item.title}' cannot exceed {checklist_item.max_score}."
                )

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
        failed_required_items = []

        score_map = {item["checklist_item_id"]: item for item in item_scores}
        pass_mark = milestone.required_checklist_score

        for checklist_item in checklist_items:
            awarded = score_map.get(checklist_item.id, {}).get("score_awarded", 0)
            # A required item must reach the milestone's pass mark (e.g. 7/10 at 70%);
            # optional items just need some credit. Zero never passes a required item,
            # even if a milestone's pass mark is set to 0.
            if checklist_item.is_required:
                passed = awarded > 0 and awarded * 100 >= pass_mark * checklist_item.max_score
            else:
                passed = awarded > 0
            if checklist_item.is_required and not passed:
                failed_required_items.append(checklist_item.title)
            QAReviewItem.objects.create(
                qa_review=review,
                checklist_item=checklist_item,
                score_awarded=awarded,
                passed=passed,
                comment=score_map.get(checklist_item.id, {}).get("comment", ""),
            )
            total_score += awarded
            max_score += checklist_item.max_score

        if decision == QAReviewDecision.APPROVED and checklist_items:
            if failed_required_items:
                raise QAReviewError(
                    f"Cannot approve: required checklist items below the {pass_mark}% pass mark: "
                    + ", ".join(failed_required_items)
                )
            score_percent = (total_score / max_score * 100) if max_score else 100
            if score_percent < milestone.required_checklist_score:
                raise QAReviewError(
                    f"Cannot approve: checklist score {score_percent:.0f}% is below the "
                    f"required {milestone.required_checklist_score}%."
                )

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
            milestone.completed_date = None
            submission.submission_status = SubmissionStatus.REJECTED
        elif decision == QAReviewDecision.REWORK_REQUIRED:
            milestone.current_status = MilestoneStatus.REWORK_REQUIRED
            milestone.completed_date = None
            submission.submission_status = SubmissionStatus.REWORK_REQUIRED
        elif decision == QAReviewDecision.FLAGGED:
            milestone.current_status = MilestoneStatus.FLAGGED
            milestone.completed_date = None
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

        ProjectService.sync_operational_status(
            submission.project,
            user=reviewer,
            reason=f"QA decision {decision} synchronized project operational status.",
        )

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
