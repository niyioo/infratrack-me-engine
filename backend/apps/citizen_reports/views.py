from django.conf import settings
from django.db.models import Count, IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.citizen_reports.models import CitizenReport
from apps.citizen_reports.serializers import (
    CitizenReportSerializer,
    CitizenReportTriageSerializer,
    PublicCitizenReportCreateSerializer,
    PublicCitizenReportStatusSerializer,
    PublicProjectSerializer,
)
from apps.citizen_reports.services import CitizenReportError, CitizenReportService
from apps.common.constants import ProjectStatus
from apps.common.pagination import OptionalPaginationMixin
from apps.common.permissions import HIGH_PRIVILEGE_ROLE_CODES, get_user_capabilities, get_user_role_codes
from apps.common.throttles import CitizenLookupThrottle, CitizenReportThrottle
from apps.projects.models import Project

# Roles that see citizen reports for every project, not just assigned ones.
CITIZEN_REPORT_GLOBAL_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES | {"QA_OFFICER"}


def get_client_ip(request):
    """
    Client IP for rate limiting and distinct-reporter counting.

    X-Forwarded-For is only trusted for the number of proxies configured in
    REST_FRAMEWORK["NUM_PROXIES"]; otherwise it is trivially spoofable.
    """
    num_proxies = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if num_proxies and forwarded:
        addresses = [a.strip() for a in forwarded.split(",") if a.strip()]
        if addresses:
            return addresses[-min(num_proxies, len(addresses))]
    return request.META.get("REMOTE_ADDR", "")


class PublicPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class PublicEndpointMixin:
    # No authentication at all: a stale staff token in the browser must not break
    # the public portal, and anonymity means we never want to attach a user.
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


# ─── public (anonymous) ──────────────────────────────────────────────────────

class PublicProjectViewSet(PublicEndpointMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = PublicProjectSerializer
    pagination_class = PublicPagination
    throttle_classes = [CitizenLookupThrottle]
    search_fields = ["project_code", "title", "state", "lga", "site_address"]
    filterset_fields = ["state", "lga", "category"]
    ordering_fields = ["title", "state"]

    def get_queryset(self):
        # Citizens report on ongoing projects only.
        return Project.objects.exclude(current_status=ProjectStatus.COMPLETED).order_by("title")


class PublicCitizenReportCreateView(PublicEndpointMixin, generics.CreateAPIView):
    serializer_class = PublicCitizenReportCreateSerializer
    throttle_classes = [CitizenReportThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("website", None)
        photo = data.pop("photo", None)
        project = get_object_or_404(
            Project.objects.exclude(current_status=ProjectStatus.COMPLETED), pk=data.pop("project_id")
        )

        try:
            report = CitizenReportService.create_report(
                project=project,
                data=data,
                photo=photo,
                fingerprint=CitizenReportService.fingerprint(get_client_ip(request)),
            )
        except CitizenReportError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(PublicCitizenReportStatusSerializer(report).data, status=status.HTTP_201_CREATED)


class PublicCitizenReportTrackView(PublicEndpointMixin, generics.RetrieveAPIView):
    serializer_class = PublicCitizenReportStatusSerializer
    throttle_classes = [CitizenLookupThrottle]
    lookup_field = "tracking_code"

    def get_object(self):
        code = self.kwargs["tracking_code"].strip().upper()
        return get_object_or_404(CitizenReport.objects.select_related("project"), tracking_code=code)


# ─── staff triage ────────────────────────────────────────────────────────────

class CitizenReportViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CitizenReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "status", "category"]
    search_fields = ["tracking_code", "description", "project__title", "project__project_code"]

    def _ensure_can_triage(self):
        if "citizen_reports.triage" not in get_user_capabilities(self.request.user):
            raise PermissionDenied("You do not have access to citizen reports.")

    def get_queryset(self):
        self._ensure_can_triage()
        # How many reports the same (anonymous) source sent about this project,
        # so staff can spot a single person flooding a project without seeing who.
        same_source = (
            CitizenReport.objects.filter(
                project=OuterRef("project"), reporter_fingerprint=OuterRef("reporter_fingerprint")
            )
            .order_by()
            .values("project")
            .annotate(total=Count("id"))
            .values("total")
        )
        queryset = CitizenReport.objects.select_related("project", "triaged_by").annotate(
            same_source_count=Coalesce(Subquery(same_source, output_field=IntegerField()), 0)
        )

        user = self.request.user
        if user.is_superuser or get_user_role_codes(user).intersection(CITIZEN_REPORT_GLOBAL_ROLE_CODES):
            return queryset
        return queryset.filter(
            project__assignments__user=user, project__assignments__is_active=True
        ).distinct()

    @action(detail=True, methods=["post"])
    def triage(self, request, pk=None):
        report = self.get_object()
        serializer = CitizenReportTriageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            report = CitizenReportService.triage(
                report=report,
                user=request.user,
                status=serializer.validated_data["status"],
                note=serializer.validated_data["note"],
                public_response=serializer.validated_data["public_response"],
            )
        except CitizenReportError as exc:
            raise ValidationError({"detail": str(exc)})
        refreshed = self.get_queryset().get(pk=report.pk)
        return Response(CitizenReportSerializer(refreshed, context=self.get_serializer_context()).data)
