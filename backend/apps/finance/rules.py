import hashlib
import json
from apps.common.constants import (
    MilestoneStatus,
    SubmissionStatus,
    TrancheStatus,
)


class TrancheEligibilityEngine:
    @classmethod
    def evaluate(cls, tranche):
        rules_passed = []
        rules_failed = []

        project = tranche.project
        milestone = getattr(tranche, "linked_milestone", None)

        if milestone is None:
            rules_failed.append("No linked milestone configured for tranche.")
        else:
            if milestone.current_status == MilestoneStatus.APPROVED:
                rules_passed.append("Linked milestone approved.")
            else:
                rules_failed.append("Linked milestone not approved.")

            approved_submissions = milestone.submissions.filter(submission_status=SubmissionStatus.APPROVED)
            if approved_submissions.exists():
                rules_passed.append("Approved evidence submission exists.")
            else:
                rules_failed.append("No approved evidence submission exists.")

            if approved_submissions.filter(integrity_status="FLAGGED").exists():
                rules_failed.append("Approved evidence has unresolved integrity flags.")
            elif approved_submissions.exists():
                rules_passed.append("Approved evidence passed integrity checks.")

            if milestone.requires_field_validation:
                field_validation_exists = milestone.submissions.filter(
                    source_type="FIELD_OFFICER",
                    submission_status=SubmissionStatus.APPROVED
                ).exists()
                if field_validation_exists:
                    rules_passed.append("Independent field validation exists.")
                else:
                    rules_failed.append("Independent field validation required but missing.")

        # Every earlier tranche must be released, not just the immediately preceding number,
        # otherwise a gap in numbering lets a later tranche skip the queue.
        earlier_tranches = project.tranches.filter(tranche_number__lt=tranche.tranche_number)
        if earlier_tranches.exists():
            if earlier_tranches.exclude(current_status=TrancheStatus.DISBURSED).exists():
                rules_failed.append("Previous tranche not disbursed.")
            else:
                rules_passed.append("Previous tranche disbursed.")

        unresolved_fraud = project.fraud_flags.filter(status="OPEN").exists()
        if unresolved_fraud:
            rules_failed.append("Project has unresolved fraud flags.")
        else:
            rules_passed.append("No unresolved fraud flags.")

        eligible = len(rules_failed) == 0
        payload = {
            "tranche_id": tranche.id,
            "eligible": eligible,
            "rules_passed": rules_passed,
            "rules_failed": rules_failed,
        }
        snapshot_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        payload["snapshot_hash"] = snapshot_hash
        return payload