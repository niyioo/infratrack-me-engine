from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.analytics.models import PortfolioMetricSnapshot, ProjectMetricSnapshot
from apps.analytics.serializers import (
    DashboardSummarySerializer,
    PortfolioMetricSnapshotSerializer,
    ProjectMetricSnapshotSerializer,
)
from apps.analytics.services import AnalyticsService, DashboardSummaryService
from apps.analytics.tasks import generate_project_snapshot_task
from apps.citizen_reports.models import CitizenReport
from apps.citizen_reports.services import OPEN_STATUSES, CitizenReportService
from apps.common.constants import MilestoneStatus
from apps.evidence.models import GeoFenceExceptionRequest
from apps.projects.models import Project
from apps.qa.models import FraudFlag
from apps.milestones.models import ProjectMilestone
from apps.common.permissions import (
    ANALYTICS_VIEWER_ROLE_CODES,
    get_user_role_codes,
    is_project_visible_to_user,
)
from apps.common.pagination import OptionalPaginationMixin


class ProjectMetricSnapshotViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ProjectMetricSnapshot.objects.select_related("project").all()
    serializer_class = ProjectMetricSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "snapshot_date"]

    def _visible_projects(self):
        user = self.request.user
        queryset = Project.objects.select_related("agency", "contractor").all()
        if user.is_superuser:
            return queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(ANALYTICS_VIEWER_ROLE_CODES):
            return queryset

        return queryset.filter(assignments__user=user, assignments__is_active=True).distinct()

    def get_queryset(self):
        return self.queryset.filter(project__in=self._visible_projects()).distinct()

    @action(detail=False, methods=["get"], url_path="dashboard-summary")
    def dashboard_summary(self, request):
        projects = self._visible_projects().prefetch_related("evidence_submissions")
        project_list = list(projects)
        project_ids = [project.id for project in project_list]
        today = timezone.now().date()
        user_roles = get_user_role_codes(request.user)

        total_budget = projects.aggregate(
            total=Coalesce(
                Sum("budget_amount"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=18, decimal_places=2),
            )
        )["total"]
        latest_snapshots = (
            self.get_queryset()
            .select_related("project")
            .order_by("-snapshot_date", "-id")[:8]
        )

        metrics = {
            "total_projects": len(project_list),
            "active_projects": sum(1 for p in project_list if p.current_status == "ACTIVE"),
            "flagged_projects_count": sum(1 for p in project_list if p.current_status == "FLAGGED"),
            "delayed_projects_count": sum(1 for p in project_list if p.current_status == "DELAYED"),
            "total_budget": str(total_budget),
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
        }
        alert_summary = {
            "delayed_milestones": ProjectMilestone.objects.filter(
                project_id__in=project_ids,
                due_date__lt=today,
            ).exclude(current_status=MilestoneStatus.APPROVED).count(),
            "unresolved_fraud_flags": FraudFlag.objects.filter(
                project_id__in=project_ids,
                status="OPEN",
            ).count(),
            "geofence_exceptions_pending": GeoFenceExceptionRequest.objects.filter(
                project_id__in=project_ids,
                status="PENDING",
            ).count(),
        }
        summary_source = "live"
        summary_snapshot_date = None

        if request.user.is_superuser or user_roles.intersection(ANALYTICS_VIEWER_ROLE_CODES):
            portfolio_snapshot = PortfolioMetricSnapshot.objects.order_by("-snapshot_date", "-id").filter(
                scope_type="GLOBAL",
                state="",
                lga="",
            ).first()
            if portfolio_snapshot:
                metrics.update(
                    {
                        "total_projects": portfolio_snapshot.total_projects,
                        "active_projects": portfolio_snapshot.active_projects,
                        "flagged_projects_count": portfolio_snapshot.flagged_projects_count,
                        "delayed_projects_count": portfolio_snapshot.delayed_projects_count,
                        "total_budget": str(portfolio_snapshot.total_budget),
                        "awaiting_verification_count": portfolio_snapshot.awaiting_verification_count,
                        "completed_projects_count": portfolio_snapshot.completed_projects_count,
                        "high_risk_projects_count": portfolio_snapshot.high_risk_projects_count,
                        "independent_validation_required_count": portfolio_snapshot.independent_validation_required_count,
                    }
                )
                alert_summary = {
                    "delayed_milestones": portfolio_snapshot.delayed_milestones_count,
                    "unresolved_fraud_flags": portfolio_snapshot.unresolved_fraud_flags_count,
                    "geofence_exceptions_pending": portfolio_snapshot.geofence_exceptions_pending_count,
                }
                summary_source = "precomputed"
                summary_snapshot_date = portfolio_snapshot.snapshot_date

        summary = DashboardSummaryService.build_summary(
            projects=project_list,
            latest_snapshots=list(latest_snapshots),
            metrics=metrics,
            alert_summary=alert_summary,
            summary_source=summary_source,
            summary_snapshot_date=summary_snapshot_date,
        )
        summary["citizen_reports"] = (
            CitizenReportService.summary_for_projects(project_ids)
            if CitizenReportService.can_view(request.user)
            else None
        )
        return Response(DashboardSummarySerializer(summary).data)

    @action(detail=False, methods=["get"], url_path="portfolio-map")
    def portfolio_map(self, request):
        """Projects with a site location, plus open citizen reports for triage roles."""
        show_citizen = CitizenReportService.can_view(request.user)
        projects = self._visible_projects().filter(site_location__isnull=False)
        if show_citizen:
            projects = projects.annotate(
                open_citizen_reports=Count("citizen_reports", filter=Q(citizen_reports__status__in=OPEN_STATUSES))
            )

        project_rows = []
        for project in projects:
            row = {
                "id": project.id,
                "project_code": project.project_code,
                "title": project.title,
                "state": project.state,
                "lga": project.lga,
                "site_address": project.site_address,
                "current_status": project.current_status,
                "risk_status": project.risk_status,
                "health_score": project.health_score,
                "health_band": project.health_band,
                "physical_completion_percent": project.physical_completion_percent,
                "budget_amount": project.budget_amount,
                "latitude": project.site_location.y,
                "longitude": project.site_location.x,
            }
            if show_citizen:
                row["open_citizen_reports"] = project.open_citizen_reports
            project_rows.append(row)

        citizen_rows = None
        if show_citizen:
            reports = (
                CitizenReport.objects.filter(
                    project__in=self._visible_projects(),
                    status__in=OPEN_STATUSES,
                    latitude__isnull=False,
                    longitude__isnull=False,
                )
                .select_related("project")
                .order_by("-created_at")[: settings.MAP_MAX_CITIZEN_REPORTS]
            )
            # Never the reporter fingerprint or photo: the map is a signal view, not
            # a way to identify who reported.
            citizen_rows = [
                {
                    "id": report.id,
                    "project_id": report.project_id,
                    "project_title": report.project.title,
                    "category": report.category,
                    "category_label": report.get_category_display(),
                    "status": report.status,
                    "created_at": report.created_at,
                    "latitude": report.latitude,
                    "longitude": report.longitude,
                }
                for report in reports
            ]

        return Response({"projects": project_rows, "citizen_reports": citizen_rows})

    @action(detail=False, methods=["post"], url_path="generate/(?P<project_id>[^/.]+)")
    def generate_for_project(self, request, project_id=None):
        project = get_object_or_404(Project.objects.select_related("agency", "contractor"), id=project_id)
        if not is_project_visible_to_user(project, request.user):
            raise PermissionDenied("You do not have access to generate analytics for this project.")
        queue = str(request.data.get("queue", "")).lower() in {"1", "true", "yes"}
        if queue:
            generate_project_snapshot_task.delay(project.id)
            return Response(
                {
                    "detail": "Project snapshot generation queued.",
                    "project_id": project.id,
                    "queued": True,
                },
                status=202,
            )
        snapshot = AnalyticsService.calculate_project_snapshot(project)
        return Response(ProjectMetricSnapshotSerializer(snapshot).data)

    @action(detail=False, methods=["get"], url_path="portfolio-breakdown")
    def portfolio_breakdown(self, request):
        user_roles = get_user_role_codes(request.user)
        if not request.user.is_superuser and not user_roles.intersection(ANALYTICS_VIEWER_ROLE_CODES):
            raise PermissionDenied("You do not have access to executive portfolio analytics.")

        snapshots = PortfolioMetricSnapshot.objects.filter(scope_type="STATE").order_by("state", "-snapshot_date")
        latest_by_state = []
        seen_states = set()
        for snapshot in snapshots:
            if snapshot.state in seen_states:
                continue
            seen_states.add(snapshot.state)
            latest_by_state.append(snapshot)
        return Response(PortfolioMetricSnapshotSerializer(latest_by_state, many=True).data)

    @action(detail=False, methods=["get"], url_path="portfolio-trends")
    def portfolio_trends(self, request):
        user_roles = get_user_role_codes(request.user)
        if not request.user.is_superuser and not user_roles.intersection(ANALYTICS_VIEWER_ROLE_CODES):
            raise PermissionDenied("You do not have access to executive portfolio trend analytics.")

        days = min(max(int(request.query_params.get("days", 30)), 1), 180)
        cutoff = timezone.now().date() - timedelta(days=days - 1)
        snapshots = PortfolioMetricSnapshot.objects.filter(
            scope_type="GLOBAL",
            snapshot_date__gte=cutoff,
        ).order_by("snapshot_date")
        return Response(PortfolioMetricSnapshotSerializer(snapshots, many=True).data)
