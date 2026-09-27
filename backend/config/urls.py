from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.common.throttles import LoginRateThrottle

from apps.accounts.views import CurrentUserView, UserViewSet, RoleViewSet
from apps.organizations.views import AgencyViewSet, ContractorViewSet
from apps.projects.views import ProjectViewSet
from apps.milestones.views import (
    MilestoneTemplateViewSet,
    ProjectMilestoneViewSet,
    MilestoneDependencyViewSet,
    MilestoneChecklistItemViewSet,
)
from apps.evidence.views import (
    EvidenceSubmissionViewSet,
    GeoFenceExceptionRequestViewSet,
)
from apps.qa.views import QAReviewViewSet, FraudFlagViewSet
from apps.finance.views import (
    FundingTrancheViewSet,
    TrancheEligibilitySnapshotViewSet,
    DisbursementViewSet,
)
from apps.audits.views import (
    AuditEventViewSet,
    IntegrityCheckLogViewSet,
    SuspiciousActivityLogViewSet,
)
from apps.analytics.views import ProjectMetricSnapshotViewSet
from apps.notifications.views import NotificationViewSet
from apps.citizen_reports.views import (
    CitizenReportViewSet,
    PublicCitizenReportCreateView,
    PublicCitizenReportTrackView,
    PublicProjectViewSet,
)

# Anonymous citizen-facing API, kept under its own prefix so it can be
# routed, rate-limited and monitored separately from the staff API.
public_router = DefaultRouter()
public_router.register(r"projects", PublicProjectViewSet, basename="public-projects")

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"roles", RoleViewSet, basename="roles")
router.register(r"agencies", AgencyViewSet, basename="agencies")
router.register(r"contractors", ContractorViewSet, basename="contractors")
router.register(r"projects", ProjectViewSet, basename="projects")
router.register(r"milestone-templates", MilestoneTemplateViewSet, basename="milestone-templates")
router.register(r"milestones", ProjectMilestoneViewSet, basename="milestones")
router.register(r"milestone-dependencies", MilestoneDependencyViewSet, basename="milestone-dependencies")
router.register(r"milestone-checklist-items", MilestoneChecklistItemViewSet, basename="milestone-checklist-items")
router.register(r"evidence-submissions", EvidenceSubmissionViewSet, basename="evidence-submissions")
router.register(r"geofence-exceptions", GeoFenceExceptionRequestViewSet, basename="geofence-exceptions")
router.register(r"qa-reviews", QAReviewViewSet, basename="qa-reviews")
router.register(r"fraud-flags", FraudFlagViewSet, basename="fraud-flags")
router.register(r"tranches", FundingTrancheViewSet, basename="tranches")
router.register(r"tranche-eligibility-snapshots", TrancheEligibilitySnapshotViewSet, basename="tranche-eligibility-snapshots")
router.register(r"disbursements", DisbursementViewSet, basename="disbursements")
router.register(r"audit-events", AuditEventViewSet, basename="audit-events")
router.register(r"integrity-checks", IntegrityCheckLogViewSet, basename="integrity-checks")
router.register(r"suspicious-activities", SuspiciousActivityLogViewSet, basename="suspicious-activities")
router.register(r"project-metric-snapshots", ProjectMetricSnapshotViewSet, basename="project-metric-snapshots")
router.register(r"notifications", NotificationViewSet, basename="notifications")
router.register(r"citizen-reports", CitizenReportViewSet, basename="citizen-reports")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", TokenObtainPairView.as_view(throttle_classes=[LoginRateThrottle]), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/public/citizen-reports/", PublicCitizenReportCreateView.as_view(), name="public-citizen-report-create"),
    path(
        "api/public/citizen-reports/<str:tracking_code>/",
        PublicCitizenReportTrackView.as_view(),
        name="public-citizen-report-track",
    ),
    path("api/public/", include(public_router.urls)),
    path("api/", include(router.urls)),
    # OpenAPI / documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
