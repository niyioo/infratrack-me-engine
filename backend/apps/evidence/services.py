import json

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from apps.common.constants import GeoValidationStatus, SubmissionStatus, MilestoneStatus
from apps.evidence.models import EvidenceSubmission, EvidenceFile, CaptureAttempt, GeoFenceExceptionRequest
from apps.evidence.geo import GeoFenceService
from apps.evidence.integrity import IntegrityService
from apps.projects.services import ProjectService


class EvidenceSubmissionService:
    @staticmethod
    def create_submission(
        *,
        project,
        milestone,
        user,
        source_type,
        notes,
        device_id,
        device_platform,
        idempotency_key="",
        capture_mode="LIVE_IN_APP",
        offline_created_at=None,
    ):
        return EvidenceSubmission.objects.create(
            project=project,
            milestone=milestone,
            submitted_by_user=user,
            submitted_by_actor_type=source_type,
            source_type=source_type,
            notes=notes,
            idempotency_key=idempotency_key,
            device_id=device_id,
            device_platform=device_platform,
            capture_mode=capture_mode or "LIVE_IN_APP",
            offline_created_at=offline_created_at,
        )

    @staticmethod
    def find_existing_submission(*, user, idempotency_key):
        if not idempotency_key:
            return None
        return (
            EvidenceSubmission.objects.select_related(
                "project",
                "milestone",
                "submitted_by_user",
            )
            .prefetch_related("files")
            .filter(submitted_by_user=user, idempotency_key=idempotency_key)
            .first()
        )

    @staticmethod
    def add_file(submission, uploaded_file, metadata):
        file_hash = IntegrityService.sha256_for_uploaded_file(uploaded_file)
        metadata_json = json.loads(json.dumps(metadata, cls=DjangoJSONEncoder))
        evidence_file = EvidenceFile.objects.create(
            evidence_submission=submission,
            file=uploaded_file,
            file_type=metadata["file_type"],
            original_filename=uploaded_file.name,
            mime_type=getattr(uploaded_file, "content_type", ""),
            file_size_bytes=uploaded_file.size,
            sha256_hash=file_hash,
            captured_at=metadata["captured_at"],
            latitude=metadata["latitude"],
            longitude=metadata["longitude"],
            altitude=metadata.get("altitude"),
            accuracy_meters=metadata.get("accuracy_meters"),
            bearing=metadata.get("bearing"),
            metadata_json=metadata_json,
            is_primary=metadata.get("is_primary", False),
        )
        integrity_status = IntegrityService.evaluate_submission_integrity(
            submission=submission,
            evidence_file=evidence_file,
            metadata=metadata_json,
        )
        if integrity_status == "FLAGGED" and submission.integrity_status != "FLAGGED":
            submission.integrity_status = "FLAGGED"
            submission.save(update_fields=["integrity_status", "updated_at"])
        elif submission.integrity_status == "PENDING":
            submission.integrity_status = "VERIFIED"
            submission.save(update_fields=["integrity_status", "updated_at"])
        return evidence_file

    @staticmethod
    def submit(submission, latitude, longitude, device_metadata):
        result = GeoFenceService.validate_project_geofence(submission.project, latitude, longitude)
        device_metadata_json = json.loads(json.dumps(device_metadata, cls=DjangoJSONEncoder))

        CaptureAttempt.objects.create(
            user=submission.submitted_by_user,
            project=submission.project,
            milestone=submission.milestone,
            latitude=latitude,
            longitude=longitude,
            distance_from_site_meters=result["distance_meters"],
            within_geofence=result["within_geofence"],
            result="ALLOWED" if result["within_geofence"] else "BLOCKED",
            reason_code="" if result["within_geofence"] else "OUTSIDE_GEOFENCE",
            device_metadata_json=device_metadata_json,
        )

        if not result["within_geofence"]:
            submission.geo_validation_status = GeoValidationStatus.FAILED
            submission.submission_status = SubmissionStatus.BLOCKED
            submission.requires_exception_review = True
            submission.save(update_fields=[
                "geo_validation_status", "submission_status",
                "requires_exception_review", "updated_at"
            ])
            raise ValueError("Submission blocked: outside project geo-fence.")

        submission.geo_validation_status = GeoValidationStatus.PASSED
        submission.submission_status = SubmissionStatus.SUBMITTED
        submission.submitted_at = timezone.now()
        submission.save(update_fields=[
            "geo_validation_status", "submission_status", "submitted_at", "updated_at"
        ])

        milestone = submission.milestone
        if milestone.current_status == MilestoneStatus.OPEN_FOR_SUBMISSION:
            milestone.current_status = MilestoneStatus.SUBMITTED
            milestone.save(update_fields=["current_status", "updated_at"])

        ProjectService.sync_operational_status(
            submission.project,
            user=submission.submitted_by_user,
            reason="Evidence submission advanced project operational status.",
        )

        return submission

    @staticmethod
    def ensure_geofence_exception_request(*, submission, latitude, longitude, distance_meters, reason, requested_by):
        return GeoFenceExceptionRequest.objects.update_or_create(
            submission=submission,
            defaults={
                "project": submission.project,
                "milestone": submission.milestone,
                "requested_by": requested_by,
                "current_latitude": latitude,
                "current_longitude": longitude,
                "distance_from_site_meters": distance_meters,
                "reason": reason,
                "status": "PENDING",
                "reviewed_by": None,
                "reviewed_at": None,
                "decision_note": "",
            },
        )
