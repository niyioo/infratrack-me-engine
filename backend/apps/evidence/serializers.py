from rest_framework import serializers
from apps.evidence.models import EvidenceSubmission, EvidenceFile, GeoFenceExceptionRequest


class EvidenceFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceFile
        exclude = []


class EvidenceSubmissionSerializer(serializers.ModelSerializer):
    files = EvidenceFileSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by_user.full_name", read_only=True)

    class Meta:
        model = EvidenceSubmission
        fields = "__all__"


class EvidenceSubmissionCreateSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    milestone_id = serializers.IntegerField()
    source_type = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_platform = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    files = serializers.ListField(child=serializers.FileField(), allow_empty=False)


class GeoFenceExceptionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeoFenceExceptionRequest
        fields = "__all__"