from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.analytics.models import ProjectMetricSnapshot
from apps.analytics.serializers import ProjectMetricSnapshotSerializer
from apps.analytics.services import AnalyticsService
from apps.projects.models import Project


class ProjectMetricSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProjectMetricSnapshot.objects.select_related("project").all()
    serializer_class = ProjectMetricSnapshotSerializer
    filterset_fields = ["project", "snapshot_date"]

    @action(detail=False, methods=["post"], url_path="generate/(?P<project_id>[^/.]+)")
    def generate_for_project(self, request, project_id=None):
        project = Project.objects.get(id=project_id)
        snapshot = AnalyticsService.calculate_project_snapshot(project)
        return Response(ProjectMetricSnapshotSerializer(snapshot).data)