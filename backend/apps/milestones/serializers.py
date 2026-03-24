from rest_framework import serializers
from apps.milestones.models import (
    MilestoneTemplate, ProjectMilestone, MilestoneDependency, MilestoneChecklistItem
)


class MilestoneChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneChecklistItem
        fields = "__all__"


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    checklist_items = MilestoneChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectMilestone
        fields = "__all__"


class MilestoneTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneTemplate
        fields = "__all__"


class MilestoneDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneDependency
        fields = "__all__"