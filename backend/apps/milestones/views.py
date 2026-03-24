from rest_framework import viewsets
from apps.milestones.models import (
    MilestoneTemplate,
    ProjectMilestone,
    MilestoneDependency,
    MilestoneChecklistItem,
)
from apps.milestones.serializers import (
    MilestoneTemplateSerializer,
    ProjectMilestoneSerializer,
    MilestoneDependencySerializer,
    MilestoneChecklistItemSerializer,
)


class MilestoneTemplateViewSet(viewsets.ModelViewSet):
    queryset = MilestoneTemplate.objects.all()
    serializer_class = MilestoneTemplateSerializer


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    queryset = ProjectMilestone.objects.prefetch_related("checklist_items", "dependencies").all()
    serializer_class = ProjectMilestoneSerializer
    filterset_fields = ["project", "current_status", "sequence_order"]


class MilestoneDependencyViewSet(viewsets.ModelViewSet):
    queryset = MilestoneDependency.objects.all()
    serializer_class = MilestoneDependencySerializer


class MilestoneChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = MilestoneChecklistItem.objects.all()
    serializer_class = MilestoneChecklistItemSerializer