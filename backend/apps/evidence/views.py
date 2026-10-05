from django.db import transaction
from django.db.utils import IntegrityError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.evidence.models import EvidenceSubmission, GeoFenceExceptionRequest
from apps.evidence.serializers import (
    EvidenceSubmissionSerializer,
    EvidenceSubmissionCreateSerializer,
    GeoFenceExceptionRequestSerializer,
    GeoFenceExceptionRequestCreateSerializer,
    GeoFenceExceptionReviewSerializer,
)
from apps.evidence.services import EvidenceSubmissionService
from apps.audits.services import AuditService
from apps.projects.services import ProjectService
from apps.projects.models import Project
from apps.milestones.models import ProjectMilestone
from apps.common.permissions import (
    EVIDENCE_SUBMITTER_ROLE_CODES,
    PROJECT_OVERSIGHT_ROLE_CODES,
    QA_REVIEWER_ROLE_CODES,
    get_user_role_codes,
    is_project_visible_to_user,
)
from apps.common.constants import MilestoneStatus, SourceType
from apps.common.pagination import OptionalPaginationMixin
from apps.common.throttles import EvidenceUploadThrottle, OverrideRequestThrottle
from apps.evidence.geo import GeoFenceService

LOCKED_MILESTONE_STATUSES = {MilestoneStatus.APPROVED, MilestoneStatus.FLAGGED}


class EvidenceSubmissionViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    queryset = EvidenceSubmission.objects.select_related(
        "project",
        "milestone",
        "submitted_by_user",
    ).prefetch_related("files").all()
    serializer_class = EvidenceSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "milestone", "source_type", "submission_status", "geo_validation_status"]
    # Evidence is append-only: status transitions happen only through the QA and
    # geo-fence exception workflows, never through a generic PATCH/PUT/DELETE.
    http_method_names = ["get", "post", "head", "options"]

    def get_throttles(self):
        if self.action == "create":
            return [EvidenceUploadThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(PROJECT_OVERSIGHT_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(
            project__assignments__user=user,
            project__assignments__is_active=True,
        ).distinct()

    def create(self, request, *args, **kwargs):
        serializer = EvidenceSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(Project, id=serializer.validated_data["project_id"])
        milestone = get_object_or_404(ProjectMilestone, id=serializer.validated_data["milestone_id"])

        if milestone.project_id != project.id:
            raise ValidationError({"milestone_id": "Milestone does not belong to the specified project."})

        if not is_project_visible_to_user(project, request.user):
            raise PermissionDenied("You do not have access to submit evidence for this project.")

        user_roles = get_user_role_codes(request.user)
        if not user_roles.intersection(EVIDENCE_SUBMITTER_ROLE_CODES) and not request.user.is_superuser:
            raise PermissionDenied("Your role is not allowed to submit project evidence.")

        # source_type drives the "independent field validation" finance rule, so it
        # must reflect the submitter's actual role rather than what the client claims.
        if (
            serializer.validated_data["source_type"] == SourceType.FIELD_OFFICER
            and "FIELD_OFFICER" not in user_roles
            and not request.user.is_superuser
        ):
            raise PermissionDenied("Only field officers can submit independent field validation evidence.")

        if milestone.current_status in LOCKED_MILESTONE_STATUSES:
            raise ValidationError(
                {"milestone_id": f"Milestone is {milestone.current_status} and no longer accepts evidence."}
            )

        idempotency_key = serializer.validated_data.get("idempotency_key", "").strip()
        existing_submission = EvidenceSubmissionService.find_existing_submission(
            user=request.user,
            idempotency_key=idempotency_key,
        )
        if existing_submission:
            if existing_submission.project_id != project.id or existing_submission.milestone_id != milestone.id:
                raise ValidationError(
                    {"idempotency_key": "This idempotency key has already been used for a different submission."}
                )
            return Response(EvidenceSubmissionSerializer(existing_submission).data, status=status.HTTP_200_OK)

        captured_at = serializer.validated_data.get("captured_at", timezone.now())
        try:
            with transaction.atomic():
                submission = EvidenceSubmissionService.create_submission(
                    project=project,
                    milestone=milestone,
                    user=request.user,
                    source_type=serializer.validated_data["source_type"],
                    notes=serializer.validated_data.get("notes", ""),
                    device_id=serializer.validated_data.get("device_id", ""),
                    device_platform=serializer.validated_data.get("device_platform", ""),
                    idempotency_key=idempotency_key,
                    capture_mode=serializer.validated_data.get("capture_mode", "LIVE_IN_APP"),
                    offline_created_at=serializer.validated_data.get("offline_created_at"),
                )

                for index, uploaded_file in enumerate(serializer.validated_data["files"]):
                    EvidenceSubmissionService.add_file(
                        submission,
                        uploaded_file,
                        {
                            "file_type": "PHOTO",
                            "captured_at": captured_at,
                            "latitude": serializer.validated_data["latitude"],
                            "longitude": serializer.validated_data["longitude"],
                            "accuracy_meters": serializer.validated_data.get("accuracy_meters"),
                            "altitude": serializer.validated_data.get("altitude"),
                            "bearing": serializer.validated_data.get("bearing"),
                            "device_id": serializer.validated_data.get("device_id", ""),
                            "device_platform": serializer.validated_data.get("device_platform", ""),
                            "device_app_version": serializer.validated_data.get("device_app_version", ""),
                            "is_primary": index == 0,
                        },
                    )
        except IntegrityError:
            existing_submission = EvidenceSubmissionService.find_existing_submission(
                user=request.user,
                idempotency_key=idempotency_key,
            )
            if existing_submission:
                return Response(EvidenceSubmissionSerializer(existing_submission).data, status=status.HTTP_200_OK)
            raise

        try:
            submission = EvidenceSubmissionService.submit(
                submission=submission,
                latitude=serializer.validated_data["latitude"],
                longitude=serializer.validated_data["longitude"],
                device_metadata={
                    "device_id": serializer.validated_data.get("device_id", ""),
                    "device_platform": serializer.validated_data.get("device_platform", ""),
                    "device_app_version": serializer.validated_data.get("device_app_version", ""),
                    "captured_at": captured_at,
                    "accuracy_meters": serializer.validated_data.get("accuracy_meters"),
                },
            )
        except ValueError as exc:
            exception_reason = serializer.validated_data.get("exception_reason") or (
                serializer.validated_data.get("notes") or "Geo-fence exception review requested."
            )
            distance_meters = (
                submission.project.captureattempt_set.order_by("-attempt_time")
                .values_list("distance_from_site_meters", flat=True)
                .first()
                or 0
            )
            exception_request, _ = EvidenceSubmissionService.ensure_geofence_exception_request(
                submission=submission,
                latitude=serializer.validated_data["latitude"],
                longitude=serializer.validated_data["longitude"],
                distance_meters=distance_meters,
                reason=exception_reason,
                requested_by=request.user,
            )
            submission.geo_validation_status = "EXCEPTION_REQUESTED"
            submission.save(update_fields=["geo_validation_status", "updated_at"])
            AuditService.log_event(
                event_type="GEOFENCE_EXCEPTION_REQUESTED",
                actor=request.user,
                project=project,
                milestone=milestone,
                action="REQUEST_EXCEPTION",
                object_type="GeoFenceExceptionRequest",
                object_id=str(exception_request.id),
                after_state=AuditService.snapshot_model(
                    exception_request,
                    fields=[
                        "id",
                        "project",
                        "milestone",
                        "submission",
                        "requested_by",
                        "status",
                        "distance_from_site_meters",
                        "reason",
                    ],
                ),
                request=request,
            )
            raise ValidationError({"detail": str(exc), "submission_id": submission.id})

        AuditService.log_event(
            event_type="EVIDENCE_SUBMITTED",
            actor=request.user,
            project=project,
            milestone=milestone,
            action="SUBMIT",
            object_type="EvidenceSubmission",
            object_id=str(submission.id),
            after_state=AuditService.snapshot_model(
                submission,
                fields=[
                    "id",
                    "project",
                    "milestone",
                    "submitted_by_user",
                    "source_type",
                    "submission_status",
                    "geo_validation_status",
                    "integrity_status",
                    "requires_exception_review",
                ],
            ),
            metadata={
                "file_count": len(serializer.validated_data["files"]),
                "latitude": serializer.validated_data["latitude"],
                "longitude": serializer.validated_data["longitude"],
            },
            request=request,
        )

        return Response(EvidenceSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


class GeoFenceExceptionRequestViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    queryset = GeoFenceExceptionRequest.objects.select_related(
        "project",
        "milestone",
        "submission",
        "requested_by",
        "reviewed_by",
    ).all()
    serializer_class = GeoFenceExceptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_throttles(self):
        if self.action == "create":
            return [OverrideRequestThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        if self.action == "create":
            return GeoFenceExceptionRequestCreateSerializer
        if self.action in {"approve", "reject"}:
            return GeoFenceExceptionReviewSerializer
        return GeoFenceExceptionRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(QA_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        milestone = serializer.validated_data["milestone"]
        submission = serializer.validated_data.get("submission")

        if milestone.project_id != project.id:
            raise ValidationError({"milestone": "Milestone does not belong to the specified project."})
        if submission and (submission.project_id != project.id or submission.milestone_id != milestone.id):
            raise ValidationError({"submission": "Submission does not belong to the specified project milestone."})
        if submission and submission.submitted_by_user_id != self.request.user.id:
            raise PermissionDenied("You can only request exceptions for your own submissions.")
        if not is_project_visible_to_user(project, self.request.user):
            raise PermissionDenied("You do not have access to request a geo-fence exception for this project.")
        if not get_user_role_codes(self.request.user).intersection(EVIDENCE_SUBMITTER_ROLE_CODES) and not self.request.user.is_superuser:
            raise PermissionDenied("Your role is not allowed to request geo-fence exceptions.")

        # Never trust a client-reported distance; reviewers decide based on this value.
        geo_result = GeoFenceService.validate_project_geofence(
            project,
            serializer.validated_data["current_latitude"],
            serializer.validated_data["current_longitude"],
        )
        exception_request = serializer.save(
            distance_from_site_meters=geo_result["distance_meters"],
            requested_by=self.request.user,
            status="PENDING",
            reviewed_by=None,
            reviewed_at=None,
            decision_note="",
        )
        AuditService.log_event(
            event_type="GEOFENCE_EXCEPTION_REQUESTED",
            actor=self.request.user,
            project=project,
            milestone=milestone,
            action="REQUEST_EXCEPTION",
            object_type="GeoFenceExceptionRequest",
            object_id=str(exception_request.id),
            after_state=AuditService.snapshot_model(
                exception_request,
                fields=[
                    "id",
                    "project",
                    "milestone",
                    "submission",
                    "requested_by",
                    "status",
                    "distance_from_site_meters",
                    "reason",
                ],
            ),
            request=self.request,
        )

    def perform_update(self, serializer):
        raise PermissionDenied("Geo-fence exceptions must be reviewed via the approve/reject actions.")

    def perform_destroy(self, instance):
        raise PermissionDenied("Geo-fence exception requests cannot be deleted.")

    def _ensure_can_review(self, user, exception_request):
        if not user.is_superuser and not get_user_role_codes(user).intersection(QA_REVIEWER_ROLE_CODES):
            raise PermissionDenied("You do not have permission to review geo-fence exceptions.")
        # Segregation of duties applies to superusers too.
        submission = exception_request.submission
        if exception_request.requested_by_id == user.id or (
            submission and submission.submitted_by_user_id == user.id
        ):
            raise PermissionDenied("You cannot review a geo-fence exception for your own submission.")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        exception_request = self.get_object()
        self._ensure_can_review(request.user, exception_request)
        if exception_request.status != "PENDING":
            raise ValidationError({"detail": "Only pending exception requests can be approved."})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        before_state = AuditService.snapshot_model(
            exception_request,
            fields=["id", "status", "reviewed_by", "reviewed_at", "decision_note"],
        )
        exception_request.status = "APPROVED"
        exception_request.reviewed_by = request.user
        exception_request.reviewed_at = timezone.now()
        exception_request.decision_note = serializer.validated_data.get("decision_note", "")
        exception_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note"])

        submission = exception_request.submission
        if submission:
            submission.geo_validation_status = "EXCEPTION_APPROVED"
            submission.submission_status = "SUBMITTED"
            submission.requires_exception_review = False
            if not submission.submitted_at:
                submission.submitted_at = timezone.now()
                submission.save(
                    update_fields=[
                        "geo_validation_status",
                        "submission_status",
                        "requires_exception_review",
                        "submitted_at",
                        "updated_at",
                    ]
                )
            else:
                submission.save(
                    update_fields=[
                        "geo_validation_status",
                        "submission_status",
                        "requires_exception_review",
                        "updated_at",
                    ]
                )
            ProjectService.sync_operational_status(
                submission.project,
                user=request.user,
                reason="Approved geo-fence exception synchronized project operational status.",
            )

        AuditService.log_event(
            event_type="GEOFENCE_EXCEPTION_APPROVED",
            actor=request.user,
            project=exception_request.project,
            milestone=exception_request.milestone,
            action="APPROVE_EXCEPTION",
            object_type="GeoFenceExceptionRequest",
            object_id=str(exception_request.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(
                exception_request,
                fields=["id", "status", "reviewed_by", "reviewed_at", "decision_note"],
            ),
            request=request,
        )
        return Response(GeoFenceExceptionRequestSerializer(exception_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        exception_request = self.get_object()
        self._ensure_can_review(request.user, exception_request)
        if exception_request.status != "PENDING":
            raise ValidationError({"detail": "Only pending exception requests can be rejected."})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        before_state = AuditService.snapshot_model(
            exception_request,
            fields=["id", "status", "reviewed_by", "reviewed_at", "decision_note"],
        )
        exception_request.status = "REJECTED"
        exception_request.reviewed_by = request.user
        exception_request.reviewed_at = timezone.now()
        exception_request.decision_note = serializer.validated_data.get("decision_note", "")
        exception_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note"])

        submission = exception_request.submission
        if submission:
            submission.requires_exception_review = False
            submission.save(update_fields=["requires_exception_review", "updated_at"])

        AuditService.log_event(
            event_type="GEOFENCE_EXCEPTION_REJECTED",
            actor=request.user,
            project=exception_request.project,
            milestone=exception_request.milestone,
            action="REJECT_EXCEPTION",
            object_type="GeoFenceExceptionRequest",
            object_id=str(exception_request.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(
                exception_request,
                fields=["id", "status", "reviewed_by", "reviewed_at", "decision_note"],
            ),
            request=request,
        )
        return Response(GeoFenceExceptionRequestSerializer(exception_request).data)
