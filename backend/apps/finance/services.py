from django.db import transaction
from django.utils import timezone
from apps.finance.models import FundingTranche, TrancheEligibilitySnapshot, Disbursement
from apps.finance.rules import TrancheEligibilityEngine
from apps.common.constants import TrancheStatus, ProjectStatus
from apps.audits.services import AuditService
from apps.projects.services import ProjectService


class FinanceService:
    @staticmethod
    def evaluate_tranche(tranche, *, evaluated_by_user=None):
        result = TrancheEligibilityEngine.evaluate(tranche)
        if tranche.current_status == TrancheStatus.DISBURSED:
            # Re-evaluating a released tranche must never rewrite its status; the
            # "previous tranche disbursed" rule for later tranches depends on it.
            return result

        TrancheEligibilitySnapshot.objects.create(
            tranche=tranche,
            is_eligible=result["eligible"],
            rules_passed_json=result["rules_passed"],
            rules_failed_json=result["rules_failed"],
            snapshot_hash=result["snapshot_hash"],
        )

        tranche.current_status = TrancheStatus.ELIGIBLE if result["eligible"] else TrancheStatus.LOCKED
        tranche.unlock_status = tranche.current_status
        tranche.unlock_reason = "; ".join(result["rules_failed"] if not result["eligible"] else result["rules_passed"])
        tranche.save(update_fields=["current_status", "unlock_status", "unlock_reason"])

        AuditService.log_event(
            event_type="TRANCHE_EVALUATED",
            actor=evaluated_by_user,
            project=tranche.project,
            tranche=tranche,
            action="evaluate_tranche",
            object_type="FundingTranche",
            object_id=str(tranche.id),
            metadata={
                "eligible": result["eligible"],
                "rules_passed": result["rules_passed"],
                "rules_failed": result["rules_failed"],
                "snapshot_hash": result["snapshot_hash"],
            },
        )

        return result

    @staticmethod
    @transaction.atomic
    def disburse_tranche(*, tranche, released_by_user, payment_reference, note=""):
        tranche = FundingTranche.objects.select_for_update().select_related("project").get(id=tranche.id)

        if tranche.current_status == TrancheStatus.DISBURSED or Disbursement.objects.filter(tranche=tranche).exists():
            raise ValueError("Tranche has already been disbursed.")

        payment_reference = payment_reference.strip()
        if not payment_reference:
            raise ValueError("Payment reference is required.")
        if Disbursement.objects.filter(payment_reference__iexact=payment_reference).exists():
            raise ValueError("Payment reference has already been used.")

        evaluation = FinanceService.evaluate_tranche(tranche, evaluated_by_user=released_by_user)
        if not evaluation["eligible"]:
            raise ValueError("Tranche is not eligible for disbursement.")

        disbursement = Disbursement.objects.create(
            tranche=tranche,
            project=tranche.project,
            amount=tranche.planned_amount,
            released_by_user=released_by_user,
            payment_reference=payment_reference,
            note=note,
            source_of_authority="SYSTEM_ELIGIBLE",
        )

        tranche.current_status = TrancheStatus.DISBURSED
        tranche.actual_release_date = timezone.now().date()
        tranche.released_by = released_by_user
        tranche.release_reference = payment_reference
        tranche.save(update_fields=[
            "current_status", "actual_release_date", "released_by", "release_reference"
        ])

        ProjectService.change_status(
            tranche.project,
            ProjectStatus.APPROVED_FOR_FUNDING,
            released_by_user,
            reason=f"Tranche {tranche.tranche_number} disbursed."
        )

        AuditService.log_event(
            event_type="TRANCHE_DISBURSED",
            actor=released_by_user,
            project=tranche.project,
            tranche=tranche,
            action="disburse_tranche",
            object_type="FundingTranche",
            object_id=str(tranche.id),
            metadata={"payment_reference": payment_reference, "amount": str(tranche.planned_amount)},
        )

        return disbursement
