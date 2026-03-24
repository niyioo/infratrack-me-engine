from django.utils import timezone
from apps.common.constants import GeoValidationStatus, SubmissionStatus, MilestoneStatus
from apps.evidence.models import EvidenceSubmission, EvidenceFile, CaptureAttempt
from apps.evidence.geo import GeoFenceService
from apps.evidence.integrity import IntegrityService
from apps.audits.services import AuditService


class EvidenceSubmissionService:
    @staticmethod
    def create_submission(*, project, milestone, user, source_type, notes, device_id, device_platform):
        return EvidenceSubmission.objects.create(
            project=project,
            milestone=milestone,
            submitted_by_user=user,
            submitted_by_actor_type=source_type,
            source_type=source_type,
            notes=notes,
            device_id=device_id,
            device_platform=device_platform,
            capture_mode="LIVE_IN_APP",
        )

    @staticmethod
    def add_file(submission, uploaded_file, metadata):
        file_hash = IntegrityService.sha256_for_uploaded_file(uploaded_file)

        return EvidenceFile.objects.create(
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
            metadata_json=metadata,
            is_primary=metadata.get("is_primary", False),
        )

    @staticmethod
    def submit(submission, latitude, longitude, device_metadata):
        result = GeoFenceService.validate_project_geofence(submission.project, latitude, longitude)

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
            device_metadata_json=device_metadata,
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

        AuditService.log_event(
            event_type="EVIDENCE_SUBMITTED",
            actor=submission.submitted_by_user,
            project=submission.project,
            milestone=submission.milestone,
            action="submit_evidence",
            object_type="EvidenceSubmission",
            object_id=str(submission.id),
            metadata={
                "source_type": submission.source_type,
                "file_count": submission.files.count(),
                "geo_validation_status": submission.geo_validation_status,
            },
        )

        return submission