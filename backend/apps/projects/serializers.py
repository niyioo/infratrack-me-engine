from rest_framework import serializers
from apps.projects.models import Project, ProjectAssignment, ProjectStatusHistory
from apps.organizations.serializers import AgencySerializer, ContractorSerializer


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ProjectAssignment
        fields = ["id", "user", "user_name", "assignment_role", "assigned_at", "is_active"]


class ProjectStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = ProjectStatusHistory
        fields = "__all__"


class ProjectSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    contractor = ContractorSerializer(read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "project_code", "title", "description", "agency", "contractor",
            "supervising_department", "category", "sector", "state", "lga", "ward",
            "site_address", "latitude", "longitude", "geo_fence_radius_meters",
            "budget_amount", "currency", "funding_cycle", "start_date",
            "expected_end_date", "actual_end_date", "current_status",
            "risk_status", "requires_independent_validation", "created_at",
        ]

    def get_latitude(self, obj):
        return obj.site_location.y if obj.site_location else None

    def get_longitude(self, obj):
        return obj.site_location.x if obj.site_location else None


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Project
        exclude = ("site_location", "created_by",)

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop("latitude")
        lng = validated_data.pop("longitude")
        validated_data["site_location"] = Point(lng, lat, srid=4326)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None and lng is not None:
            instance.site_location = Point(lng, lat, srid=4326)
        return super().update(instance, validated_data)