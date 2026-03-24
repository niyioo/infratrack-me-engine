from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.evidence.models import EvidenceSubmission, GeoFenceExceptionRequest
from apps.evidence.serializers import (
    EvidenceSubmissionSerializer,
    EvidenceSubmissionCreateSerializer,
    GeoFenceExceptionRequestSerializer,
)
from apps.evidence.services import EvidenceSubmissionService
from apps.projects.models import Project
from apps.milestones.models import ProjectMilestone


class EvidenceSubmissionViewSet(viewsets.ModelViewSet):
    queryset = EvidenceSubmission.objects.prefetch_related("files").all()
    serializer_class = EvidenceSubmissionSerializer
    filterset_fields = ["project", "milestone", "source_type", "submission_status", "geo_validation_status"]

    def create(self, request, *args, **kwargs):
        serializer = EvidenceSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = Project.objects.get(id=serializer.validated_data["project_id"])
        milestone = ProjectMilestone.objects.get(id=serializer.validated_data["milestone_id"])

        submission = EvidenceSubmissionService.create_submission(
            project=project,
            milestone=milestone,
            user=request.user,
            source_type=serializer.validated_data["source_type"],
            notes=serializer.validated_data.get("notes", ""),
            device_id=serializer.validated_data.get("device_id", ""),
            device_platform=serializer.validated_data.get("device_platform", ""),
        )

        for index, uploaded_file in enumerate(serializer.validated_data["files"]):
            EvidenceSubmissionService.add_file(
                submission,
                uploaded_file,
                {
                    "file_type": "PHOTO",
                    "captured_at": timezone.now(),
                    "latitude": serializer.validated_data["latitude"],
                    "longitude": serializer.validated_data["longitude"],
                    "is_primary": index == 0,
                },
            )

        submission = EvidenceSubmissionService.submit(
            submission=submission,
            latitude=serializer.validated_data["latitude"],
            longitude=serializer.validated_data["longitude"],
            device_metadata={"device_id": serializer.validated_data.get("device_id", "")},
        )

        return Response(EvidenceSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


class GeoFenceExceptionRequestViewSet(viewsets.ModelViewSet):
    queryset = GeoFenceExceptionRequest.objects.all()
    serializer_class = GeoFenceExceptionRequestSerializer