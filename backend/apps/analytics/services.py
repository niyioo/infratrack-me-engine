from decimal import Decimal
from django.utils import timezone
from apps.analytics.models import ProjectMetricSnapshot
from apps.common.constants import MilestoneStatus, TrancheStatus


class AnalyticsService:
    @staticmethod
    def calculate_project_snapshot(project):
        milestones = project.milestones.all()
        total_milestones = milestones.count()
        approved_milestones = milestones.filter(current_status=MilestoneStatus.APPROVED).count()

        physical_completion = Decimal("0.00")
        if total_milestones > 0:
            physical_completion = Decimal(approved_milestones * 100) / Decimal(total_milestones)

        tranches = project.tranches.all()
        disbursed_total = sum([t.planned_amount for t in tranches if t.current_status == TrancheStatus.DISBURSED], Decimal("0.00"))
        financial_percent = Decimal("0.00")
        if project.budget_amount > 0:
            financial_percent = (disbursed_total * 100) / project.budget_amount

        burn_variance = financial_percent - physical_completion
        delayed_days = max((timezone.now().date() - project.expected_end_date).days, 0) if project.expected_end_date else 0
        flagged_count = project.fraud_flags.filter(status="OPEN").count()
        risk_score = min(max(abs(burn_variance) + flagged_count * 10, 0), 100)

        return ProjectMetricSnapshot.objects.create(
            project=project,
            snapshot_date=timezone.now().date(),
            physical_completion_percent=round(physical_completion, 2),
            financial_disbursement_percent=round(financial_percent, 2),
            burn_variance_percent=round(burn_variance, 2),
            delayed_days=delayed_days,
            risk_score=round(risk_score, 2),
            flagged_count=flagged_count,
            approved_milestones=approved_milestones,
            total_milestones=total_milestones,
        )