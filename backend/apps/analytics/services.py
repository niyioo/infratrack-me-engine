from datetime import timedelta
from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from apps.analytics.models import PortfolioMetricSnapshot, ProjectMetricSnapshot
from apps.common.constants import MilestoneStatus, ReportingFrequency, TrancheStatus
from apps.evidence.models import GeoFenceExceptionRequest
from apps.milestones.models import ProjectMilestone
from apps.projects.models import Project
from apps.qa.models import FraudFlag


class AnalyticsService:
    REPORTING_WINDOW_DAYS = {
        ReportingFrequency.WEEKLY: 7,
        ReportingFrequency.BIWEEKLY: 14,
        ReportingFrequency.MONTHLY: 30,
        ReportingFrequency.QUARTERLY: 90,
    }

    @staticmethod
    def _calculate_snapshot_values(project):
        milestones = project.milestones.all()
        total_milestones = milestones.count()
        approved_milestones = milestones.filter(current_status=MilestoneStatus.APPROVED).count()

        physical_completion = Decimal("0.00")
        if total_milestones > 0:
            physical_completion = Decimal(approved_milestones * 100) / Decimal(total_milestones)

        tranches = project.tranches.all()
        disbursed_total = sum(
            [t.planned_amount for t in tranches if t.current_status == TrancheStatus.DISBURSED],
            Decimal("0.00"),
        )
        financial_percent = Decimal("0.00")
        if project.budget_amount > 0:
            financial_percent = (disbursed_total * 100) / project.budget_amount

        burn_variance = financial_percent - physical_completion
        delayed_days = max((timezone.now().date() - project.expected_end_date).days, 0) if project.expected_end_date else 0
        flagged_count = project.fraud_flags.filter(status="OPEN").count()
        risk_score = min(max(abs(burn_variance) + flagged_count * 10, 0), 100)

        return {
            "physical_completion_percent": round(physical_completion, 2),
            "financial_disbursement_percent": round(financial_percent, 2),
            "burn_variance_percent": round(burn_variance, 2),
            "delayed_days": delayed_days,
            "risk_score": round(risk_score, 2),
            "flagged_count": flagged_count,
            "approved_milestones": approved_milestones,
            "total_milestones": total_milestones,
        }

    @staticmethod
    def calculate_health_score(*, physical_completion_percent, financial_disbursement_percent, delayed_days, flagged_count):
        schedule_score = max(0, 100 - min(delayed_days * 2, 100))
        variance_gap = abs(Decimal(financial_disbursement_percent) - Decimal(physical_completion_percent))
        budget_score = max(0, 100 - min(int(variance_gap * 2), 100))
        flag_score = max(0, 100 - min(flagged_count * 25, 100))

        health_score = (
            Decimal(physical_completion_percent) * Decimal("0.45")
            + Decimal(schedule_score) * Decimal("0.25")
            + Decimal(budget_score) * Decimal("0.20")
            + Decimal(flag_score) * Decimal("0.10")
        )
        return int(max(0, min(round(health_score), 100)))

    @staticmethod
    def health_band(health_score):
        if health_score >= 80:
            return "HEALTHY"
        if health_score >= 60:
            return "WATCH"
        if health_score >= 40:
            return "AT_RISK"
        return "CRITICAL"

    @staticmethod
    def project_lifecycle_stage(project):
        stage_map = {
            "NOT_STARTED": "INITIATED",
            "ACTIVE": "IN_PROGRESS",
            "DELAYED": "IN_PROGRESS",
            "FLAGGED": "IN_PROGRESS",
            "SUSPENDED": "APPROVED",
            "AWAITING_VERIFICATION": "VERIFIED_PENDING",
            "APPROVED_FOR_FUNDING": "FUNDED",
            "COMPLETED": "COMPLETED",
        }
        return stage_map.get(project.current_status, "INITIATED")

    @staticmethod
    def build_project_alerts(project, snapshot_values=None):
        values = snapshot_values or AnalyticsService._calculate_snapshot_values(project)
        alerts = []
        today = timezone.now().date()

        overdue_milestones = project.milestones.filter(due_date__lt=today).exclude(
            current_status=MilestoneStatus.APPROVED
        ).count()
        if overdue_milestones:
            alerts.append(
                {
                    "code": "DELAYED_MILESTONES",
                    "severity": "HIGH" if overdue_milestones > 2 else "MEDIUM",
                    "message": f"{overdue_milestones} milestone(s) are overdue.",
                }
            )

        if Decimal(values["financial_disbursement_percent"]) - Decimal(values["physical_completion_percent"]) > 15:
            alerts.append(
                {
                    "code": "BUDGET_VARIANCE",
                    "severity": "HIGH",
                    "message": "Financial disbursement is materially ahead of verified physical progress.",
                }
            )

        if values["flagged_count"] > 0:
            alerts.append(
                {
                    "code": "OPEN_FRAUD_FLAGS",
                    "severity": "CRITICAL" if values["flagged_count"] > 1 else "HIGH",
                    "message": f"{values['flagged_count']} unresolved fraud flag(s) require attention.",
                }
            )

        if project.requires_independent_validation and project.current_status == "AWAITING_VERIFICATION":
            alerts.append(
                {
                    "code": "VALIDATION_PENDING",
                    "severity": "MEDIUM",
                    "message": "Independent validation is still pending for this project.",
                }
            )

        return alerts

    @staticmethod
    def reporting_window_days(reporting_frequency):
        return AnalyticsService.REPORTING_WINDOW_DAYS.get(reporting_frequency)

    @staticmethod
    def reporting_compliance(project):
        window_days = AnalyticsService.reporting_window_days(project.reporting_frequency)
        if not window_days or project.current_status == "COMPLETED":
            return None

        submissions = list(project.evidence_submissions.all())
        latest_submission = max(
            submissions,
            key=lambda submission: submission.submitted_at or submission.created_at,
            default=None,
        )

        anchor_date = None
        last_reported_at = None
        if latest_submission:
            last_reported_at = latest_submission.submitted_at or latest_submission.created_at
            anchor_date = last_reported_at.date()
        elif project.start_date:
            anchor_date = project.start_date
        else:
            anchor_date = project.created_at.date()

        reporting_due_date = anchor_date + timedelta(days=window_days)
        days_overdue = (timezone.now().date() - reporting_due_date).days
        if days_overdue > 0:
            return {
                "attention_reason": "REPORT_OVERDUE",
                "attention_level": "HIGH" if days_overdue > 7 else "MEDIUM",
                "reporting_frequency": project.reporting_frequency,
                "reporting_due_date": reporting_due_date,
                "last_reported_at": last_reported_at,
                "days_overdue": days_overdue,
            }

        days_until_due = abs(days_overdue)
        if days_until_due <= min(3, window_days):
            return {
                "attention_reason": "REPORT_DUE_SOON",
                "attention_level": "LOW",
                "reporting_frequency": project.reporting_frequency,
                "reporting_due_date": reporting_due_date,
                "last_reported_at": last_reported_at,
                "days_overdue": 0,
            }

        return None

    @staticmethod
    def calculate_project_snapshot(project):
        snapshot_date = timezone.now().date()
        defaults = AnalyticsService._calculate_snapshot_values(project)
        snapshot, _ = ProjectMetricSnapshot.objects.update_or_create(
            project=project,
            snapshot_date=snapshot_date,
            defaults=defaults,
        )
        return snapshot

    @staticmethod
    def _build_portfolio_snapshot_defaults(projects, *, snapshot_date):
        project_list = list(projects)
        project_ids = [project.id for project in project_list]

        total_budget = projects.aggregate(
            total=Coalesce(
                Sum("budget_amount"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=18, decimal_places=2),
            )
        )["total"]

        return {
            "total_projects": len(project_list),
            "active_projects": sum(1 for p in project_list if p.current_status == "ACTIVE"),
            "flagged_projects_count": sum(1 for p in project_list if p.current_status == "FLAGGED"),
            "delayed_projects_count": sum(1 for p in project_list if p.current_status == "DELAYED"),
            "total_budget": total_budget,
            "awaiting_verification_count": sum(
                1 for p in project_list if p.current_status == "AWAITING_VERIFICATION"
            ),
            "completed_projects_count": sum(1 for p in project_list if p.current_status == "COMPLETED"),
            "high_risk_projects_count": sum(
                1 for p in project_list if p.risk_status in {"HIGH", "CRITICAL"}
            ),
            "independent_validation_required_count": sum(
                1 for p in project_list if p.requires_independent_validation
            ),
            "delayed_milestones_count": ProjectMilestone.objects.filter(
                project_id__in=project_ids,
                due_date__lt=snapshot_date,
            ).exclude(current_status=MilestoneStatus.APPROVED).count(),
            "unresolved_fraud_flags_count": FraudFlag.objects.filter(
                project_id__in=project_ids,
                status="OPEN",
            ).count(),
            "geofence_exceptions_pending_count": GeoFenceExceptionRequest.objects.filter(
                project_id__in=project_ids,
                status="PENDING",
            ).count(),
        }

    @staticmethod
    def calculate_portfolio_snapshot(*, projects, snapshot_date=None, scope_type="GLOBAL", state="", lga=""):
        snapshot_date = snapshot_date or timezone.now().date()
        defaults = AnalyticsService._build_portfolio_snapshot_defaults(projects, snapshot_date=snapshot_date)
        snapshot, _ = PortfolioMetricSnapshot.objects.update_or_create(
            snapshot_date=snapshot_date,
            scope_type=scope_type,
            state=state,
            lga=lga,
            defaults=defaults,
        )
        return snapshot

    @staticmethod
    def refresh_portfolio_snapshots(*, snapshot_date=None):
        snapshot_date = snapshot_date or timezone.now().date()
        projects = Project.objects.select_related("agency", "contractor").all()
        created_snapshots = [
            AnalyticsService.calculate_portfolio_snapshot(
                projects=projects,
                snapshot_date=snapshot_date,
                scope_type="GLOBAL",
            )
        ]

        for state in projects.order_by().values_list("state", flat=True).distinct():
            state_projects = projects.filter(state=state)
            created_snapshots.append(
                AnalyticsService.calculate_portfolio_snapshot(
                    projects=state_projects,
                    snapshot_date=snapshot_date,
                    scope_type="STATE",
                    state=state,
                )
            )

        return created_snapshots


class DashboardSummaryService:
    @staticmethod
    def _project_summary(project):
        return {
            "id": project.id,
            "project_code": project.project_code,
            "title": project.title,
            "state": project.state,
            "lga": project.lga,
            "site_address": project.site_address,
            "current_status": project.current_status,
            "risk_status": project.risk_status,
            "lifecycle_stage": AnalyticsService.project_lifecycle_stage(project),
            "budget_amount": str(project.budget_amount),
            "requires_independent_validation": project.requires_independent_validation,
            "expected_end_date": project.expected_end_date,
            "created_at": project.created_at,
        }

    @staticmethod
    def _map_project(project):
        summary = DashboardSummaryService._project_summary(project)
        summary.update(
            {
                "latitude": project.site_location.y if project.site_location else None,
                "longitude": project.site_location.x if project.site_location else None,
            }
        )
        return summary

    @staticmethod
    def _intervention_rank(project):
        if project.current_status == "FLAGGED":
            return 0
        if project.risk_status == "CRITICAL":
            return 1
        if project.current_status == "DELAYED":
            return 2
        if project.risk_status == "HIGH":
            return 3
        if project.current_status == "AWAITING_VERIFICATION" and project.requires_independent_validation:
            return 4
        return 5

    @staticmethod
    def _intervention_item(project, *, attention_reason, attention_level, reporting_due_date=None, last_reported_at=None, days_overdue=0):
        summary = DashboardSummaryService._project_summary(project)
        summary.update(
            {
                "attention_reason": attention_reason,
                "attention_level": attention_level,
                "reporting_frequency": project.reporting_frequency,
                "reporting_due_date": reporting_due_date,
                "last_reported_at": last_reported_at,
                "days_overdue": days_overdue,
            }
        )
        return summary

    @staticmethod
    def build_summary(
        *,
        projects,
        latest_snapshots,
        metrics,
        alert_summary,
        summary_source,
        summary_snapshot_date,
    ):
        project_list = list(projects)

        flagged_projects = [p for p in project_list if p.current_status == "FLAGGED"][:5]
        delayed_projects = [p for p in project_list if p.current_status == "DELAYED"][:5]
        intervention_projects = [
            project
            for project in project_list
            if project.current_status in {"FLAGGED", "DELAYED", "AWAITING_VERIFICATION"}
            or project.risk_status in {"HIGH", "CRITICAL"}
        ]
        intervention_projects.sort(
            key=lambda project: (
                DashboardSummaryService._intervention_rank(project),
                project.expected_end_date or timezone.now().date(),
                project.created_at,
            )
        )
        intervention_queue = []
        for project in intervention_projects[:6]:
            if project.current_status == "FLAGGED":
                attention_reason = "FLAGGED_PROJECT"
                attention_level = "CRITICAL"
            elif project.risk_status == "CRITICAL":
                attention_reason = "CRITICAL_RISK"
                attention_level = "CRITICAL"
            elif project.current_status == "DELAYED":
                attention_reason = "DELIVERY_DELAY"
                attention_level = "HIGH"
            elif project.current_status == "AWAITING_VERIFICATION":
                attention_reason = "VERIFICATION_PENDING"
                attention_level = "MEDIUM"
            else:
                attention_reason = "RISK_REVIEW"
                attention_level = "HIGH"
            intervention_queue.append(
                DashboardSummaryService._intervention_item(
                    project,
                    attention_reason=attention_reason,
                    attention_level=attention_level,
                )
            )

        compliance_queue = []
        for project in project_list:
            compliance = AnalyticsService.reporting_compliance(project)
            if not compliance:
                continue
            compliance_queue.append(
                DashboardSummaryService._intervention_item(
                    project,
                    attention_reason=compliance["attention_reason"],
                    attention_level=compliance["attention_level"],
                    reporting_due_date=compliance["reporting_due_date"],
                    last_reported_at=compliance["last_reported_at"],
                    days_overdue=compliance["days_overdue"],
                )
            )
        compliance_queue.sort(
            key=lambda item: (
                0 if item["attention_reason"] == "REPORT_OVERDUE" else 1,
                -item["days_overdue"],
                item["expected_end_date"] or timezone.now().date(),
            )
        )

        return {
            **metrics,
            "alert_summary": alert_summary,
            "map_projects": [DashboardSummaryService._map_project(project) for project in project_list],
            "flagged_projects": [
                DashboardSummaryService._project_summary(project) for project in flagged_projects
            ],
            "delayed_projects": [
                DashboardSummaryService._project_summary(project) for project in delayed_projects
            ],
            "intervention_queue": intervention_queue,
            "compliance_queue": compliance_queue[:6],
            "recent_projects": [
                DashboardSummaryService._project_summary(project)
                for project in sorted(project_list, key=lambda item: item.created_at, reverse=True)[:10]
            ],
            "latest_snapshots": latest_snapshots,
            "summary_source": summary_source,
            "summary_snapshot_date": summary_snapshot_date,
        }
