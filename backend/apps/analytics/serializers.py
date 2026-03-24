from rest_framework import serializers
from apps.analytics.models import ProjectMetricSnapshot


class ProjectMetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMetricSnapshot
        fields = "__all__"