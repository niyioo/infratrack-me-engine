import hashlib
import json
from datetime import timedelta

from django.core.serializers.json import DjangoJSONEncoder
from django.utils.dateparse import parse_datetime
from django.utils import timezone

from apps.audits.models import IntegrityCheckLog, SuspiciousActivityLog
from apps.evidence.models import EvidenceFile


class IntegrityService:
    @staticmethod
    def normalize_json(value):
        return json.loads(json.dumps(value or {}, cls=DjangoJSONEncoder))

    @staticmethod
    def sha256_for_uploaded_file(file_obj):
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def log_integrity_check(*, evidence_file, check_type, result, details=None):
        return IntegrityCheckLog.objects.create(
            evidence_file=evidence_file,
            check_type=check_type,
            result=result,
            details_json=IntegrityService.normalize_json(details),
        )

    @staticmethod
    def log_suspicious_activity(*, submission, activity_type, severity, details=None):
        return SuspiciousActivityLog.objects.create(
            project=submission.project,
            user=submission.submitted_by_user,
            submission=submission,
            activity_type=activity_type,
            severity=severity,
            details_json=IntegrityService.normalize_json(details),
        )

    @staticmethod
    def evaluate_submission_integrity(*, submission, evidence_file, metadata):
        issues = []
        captured_at = metadata.get("captured_at")
        if isinstance(captured_at, str):
            captured_at = parse_datetime(captured_at)
        now = timezone.now()

        if captured_at:
            if captured_at > now + timedelta(minutes=5):
                issues.append(("CAPTURE_TIME_IN_FUTURE", "HIGH", {"captured_at": captured_at, "server_time": now}))
            if captured_at < now - timedelta(days=30):
                issues.append(("CAPTURE_TIME_TOO_OLD", "MEDIUM", {"captured_at": captured_at, "server_time": now}))

        accuracy_meters = metadata.get("accuracy_meters")
        if accuracy_meters is not None and accuracy_meters > 100:
            issues.append(("LOW_GPS_ACCURACY", "MEDIUM", {"accuracy_meters": accuracy_meters}))

        device_id = metadata.get("device_id") or submission.device_id
        previous_device_ids = set(
            submission.files.exclude(id=evidence_file.id)
            .values_list("metadata_json__device_id", flat=True)
        )
        previous_device_ids.discard(None)
        previous_device_ids.discard("")
        if device_id and previous_device_ids and device_id not in previous_device_ids:
            issues.append(
                (
                    "DEVICE_ID_MISMATCH",
                    "HIGH",
                    {"device_id": device_id, "previous_device_ids": sorted(previous_device_ids)},
                )
            )

        # Check globally: the same photo reused on a different project is a common fraud pattern.
        duplicate_hash_exists = (
            EvidenceFile.objects.filter(sha256_hash=evidence_file.sha256_hash)
            .exclude(evidence_submission_id=submission.id)
            .exists()
        )
        if duplicate_hash_exists:
            issues.append(
                (
                    "DUPLICATE_MEDIA_HASH",
                    "HIGH",
                    {"sha256_hash": evidence_file.sha256_hash},
                )
            )

        if issues:
            for code, severity, details in issues:
                IntegrityService.log_integrity_check(
                    evidence_file=evidence_file,
                    check_type=code,
                    result="FLAGGED",
                    details=details,
                )
                IntegrityService.log_suspicious_activity(
                    submission=submission,
                    activity_type=code,
                    severity=severity,
                    details=details,
                )
            return "FLAGGED"

        IntegrityService.log_integrity_check(
            evidence_file=evidence_file,
            check_type="BASELINE_TRUST_CHECKS",
            result="PASSED",
            details={
                "captured_at": captured_at,
                "accuracy_meters": accuracy_meters,
                "device_id": device_id,
            },
        )
        return "VERIFIED"
