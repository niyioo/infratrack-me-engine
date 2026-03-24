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

            approved_submission_exists = milestone.submissions.filter(
                submission_status=SubmissionStatus.APPROVED
            ).exists()
            if approved_submission_exists:
                rules_passed.append("Approved evidence submission exists.")
            else:
                rules_failed.append("No approved evidence submission exists.")

            if milestone.requires_field_validation:
                field_validation_exists = milestone.submissions.filter(
                    source_type="FIELD_OFFICER",
                    submission_status=SubmissionStatus.APPROVED
                ).exists()
                if field_validation_exists:
                    rules_passed.append("Independent field validation exists.")
                else:
                    rules_failed.append("Independent field validation required but missing.")

        previous_tranche = project.tranches.filter(tranche_number=tranche.tranche_number - 1).first()
        if previous_tranche:
            if previous_tranche.current_status == TrancheStatus.DISBURSED:
                rules_passed.append("Previous tranche disbursed.")
            else:
                rules_failed.append("Previous tranche not disbursed.")

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