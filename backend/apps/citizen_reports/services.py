import hashlib
import hmac
import io
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.utils import timezone
from PIL import Image, ImageOps, UnidentifiedImageError

from apps.accounts.models import User
from apps.audits.services import AuditService
from apps.citizen_reports.models import (
    CONCERN_CATEGORIES,
    CitizenReport,
    CitizenReportStatus,
)
from apps.common.constants import RiskStatus
from apps.common.permissions import HIGH_PRIVILEGE_ROLE_CODES
from apps.notifications.services import NotificationService
from apps.projects.models import Project
from apps.qa.models import FraudFlag

TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I confusion
RISK_RANK = {RiskStatus.LOW: 0, RiskStatus.MEDIUM: 1, RiskStatus.HIGH: 2, RiskStatus.CRITICAL: 3}
TERMINAL_STATUSES = {CitizenReportStatus.RESOLVED, CitizenReportStatus.DISMISSED}
OPEN_STATUSES = [
    CitizenReportStatus.NEW,
    CitizenReportStatus.UNDER_REVIEW,
    CitizenReportStatus.FIELD_VISIT_REQUESTED,
]
MAX_PHOTO_DIMENSION = 2048


class CitizenReportError(ValueError):
    pass


def _setting(name, default):
    return getattr(settings, name, default)


class CitizenReportService:
    @staticmethod
    def fingerprint(ip_address):
        return hmac.new(settings.SECRET_KEY.encode(), (ip_address or "").encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def generate_tracking_code():
        while True:
            code = "CR-" + "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(8))
            if not CitizenReport.objects.filter(tracking_code=code).exists():
                return code

    @staticmethod
    def sanitize_photo(uploaded):
        """
        Re-encode the photo as a plain JPEG. This strips EXIF (phones embed the
        reporter's GPS position and device details), and neutralises files that
        merely claim to be images.
        """
        try:
            image = Image.open(uploaded)
            image.verify()
            uploaded.seek(0)
            image = Image.open(uploaded)
            image = ImageOps.exif_transpose(image)
        except (UnidentifiedImageError, OSError, SyntaxError):
            raise CitizenReportError("The photo could not be read. Please upload a JPEG or PNG image.")

        image = image.convert("RGB")
        image.thumbnail((MAX_PHOTO_DIMENSION, MAX_PHOTO_DIMENSION))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        return ContentFile(buffer.getvalue(), name="photo.jpg")

    @staticmethod
    @transaction.atomic
    def create_report(*, project, data, photo, fingerprint):
        """Returns (report, created). A repeated client_key returns the original report."""
        client_key = data.pop("client_key", "") or ""
        if client_key:
            existing = CitizenReport.objects.filter(client_key=client_key).first()
            if existing:
                return existing, False

        daily_limit = _setting("CITIZEN_REPORT_DAILY_LIMIT_PER_PROJECT", 3)
        recent_same_source = CitizenReport.objects.filter(
            project=project,
            reporter_fingerprint=fingerprint,
            created_at__gte=timezone.now() - timedelta(days=1),
        ).count()
        if recent_same_source >= daily_limit:
            raise CitizenReportError(
                "You have already sent several reports about this project today. Thank you. We will review them."
            )

        try:
            with transaction.atomic():
                report = CitizenReport.objects.create(
                    tracking_code=CitizenReportService.generate_tracking_code(),
                    project=project,
                    reporter_fingerprint=fingerprint,
                    client_key=client_key,
                    photo=CitizenReportService.sanitize_photo(photo) if photo else None,
                    **data,
                )
        except IntegrityError:
            # Two copies of the same retry raced; the other one won.
            if client_key:
                existing = CitizenReport.objects.filter(client_key=client_key).first()
                if existing:
                    return existing, False
            raise
        AuditService.log_event(
            event_type="CITIZEN_REPORT_RECEIVED",
            actor=None,
            project=project,
            action="CREATE",
            object_type="CitizenReport",
            object_id=str(report.id),
            after_state={"tracking_code": report.tracking_code, "category": report.category},
        )
        CitizenReportService.evaluate_volume(project)
        return report, True

    @staticmethod
    def distinct_concern_reporters(project):
        window_start = timezone.now() - timedelta(days=_setting("CITIZEN_REPORT_WINDOW_DAYS", 30))
        return (
            CitizenReport.objects.filter(
                project=project,
                category__in=CONCERN_CATEGORIES,
                created_at__gte=window_start,
            )
            .exclude(status=CitizenReportStatus.DISMISSED)
            .values("reporter_fingerprint")
            .distinct()
            .count()
        )

    @staticmethod
    def evaluate_volume(project):
        """
        Raise project risk when enough *distinct* reporters raise concerns.

        This only ever raises risk_status so staff attention goes to the project.
        It deliberately never creates a fraud flag: anonymous volume alone must not
        be able to freeze a contractor's payments. Staff escalation does that.
        """
        reporters = CitizenReportService.distinct_concern_reporters(project)
        if reporters >= _setting("CITIZEN_REPORT_CRITICAL_THRESHOLD", 6):
            target = RiskStatus.CRITICAL
        elif reporters >= _setting("CITIZEN_REPORT_HIGH_THRESHOLD", 3):
            target = RiskStatus.HIGH
        else:
            return None

        project = Project.objects.select_for_update().get(pk=project.pk)
        if RISK_RANK.get(project.risk_status, 0) >= RISK_RANK[target]:
            return None

        previous = project.risk_status
        project.risk_status = target
        project.save(update_fields=["risk_status", "updated_at"])
        AuditService.log_event(
            event_type="PROJECT_RISK_RAISED_BY_CITIZEN_REPORTS",
            actor=None,
            project=project,
            action="RISK_ESCALATION",
            object_type="Project",
            object_id=str(project.id),
            before_state={"risk_status": previous},
            after_state={"risk_status": target},
            metadata={"distinct_reporters": reporters},
        )
        NotificationService.create_notifications(
            CitizenReportService.triage_recipients(project),
            title=f"Citizen concerns raised risk on {project.project_code}",
            message=(
                f"{reporters} different citizens reported concerns about '{project.title}' in the last "
                f"{_setting('CITIZEN_REPORT_WINDOW_DAYS', 30)} days. Risk raised from {previous} to {target}."
            ),
        )
        return target

    @staticmethod
    def can_view(user):
        # Same gate as the triage queue: contractors and field staff never see
        # complaint signals, since they may be the subject of them.
        from apps.common.permissions import get_user_capabilities

        return "citizen_reports.triage" in get_user_capabilities(user)

    @staticmethod
    def summary_for_projects(project_ids):
        reports = CitizenReport.objects.filter(project_id__in=project_ids)
        return {
            "open": reports.filter(status__in=OPEN_STATUSES).count(),
            "escalated": reports.filter(status=CitizenReportStatus.ESCALATED).count(),
            "new_last_7_days": reports.filter(created_at__gte=timezone.now() - timedelta(days=7)).count(),
        }

    @staticmethod
    def summary_for_project(project):
        summary = CitizenReportService.summary_for_projects([project.id])
        recent = (
            CitizenReport.objects.filter(project=project, status__in=OPEN_STATUSES)
            .order_by("-created_at")[:5]
        )
        summary.update(
            {
                "total": CitizenReport.objects.filter(project=project).count(),
                "distinct_concern_reporters": CitizenReportService.distinct_concern_reporters(project),
                "window_days": _setting("CITIZEN_REPORT_WINDOW_DAYS", 30),
                "high_threshold": _setting("CITIZEN_REPORT_HIGH_THRESHOLD", 3),
                "critical_threshold": _setting("CITIZEN_REPORT_CRITICAL_THRESHOLD", 6),
                "recent_open": [
                    {
                        "id": report.id,
                        "tracking_code": report.tracking_code,
                        "category_label": report.get_category_display(),
                        "status": report.status,
                        "created_at": report.created_at,
                    }
                    for report in recent
                ],
            }
        )
        return summary

    @staticmethod
    def triage_recipients(project):
        # Contractors and field staff on the project are deliberately excluded:
        # they may be the subject of the complaint.
        governance = User.objects.filter(user_roles__role__code__in=HIGH_PRIVILEGE_ROLE_CODES, is_active=True)
        project_staff = User.objects.filter(
            assignments__project=project,
            assignments__is_active=True,
            user_roles__role__code__in=["M_E_OFFICER", "QA_OFFICER"],
            is_active=True,
        )
        return list((governance | project_staff).distinct())

    @staticmethod
    @transaction.atomic
    def triage(*, report, user, status, note, public_response):
        report = CitizenReport.objects.select_for_update().select_related("project").get(pk=report.pk)
        if report.status in TERMINAL_STATUSES:
            raise CitizenReportError("This report is already closed.")
        if status == CitizenReportStatus.NEW:
            raise CitizenReportError("A report cannot be moved back to NEW.")
        if status in {CitizenReportStatus.ESCALATED, CitizenReportStatus.DISMISSED} and not note.strip():
            raise CitizenReportError("A triage note is required to escalate or dismiss a report.")

        before_state = {"status": report.status}
        report.status = status
        report.triaged_by = user
        report.triaged_at = timezone.now()
        report.triage_note = note
        if public_response:
            report.public_response = public_response

        if status == CitizenReportStatus.ESCALATED and report.fraud_flag_id is None:
            # An open fraud flag blocks tranche release through TrancheEligibilityEngine.
            report.fraud_flag = FraudFlag.objects.create(
                project=report.project,
                flagged_by=user,
                flag_type="CITIZEN_REPORT_ESCALATION",
                severity="HIGH",
                description=f"Escalated citizen report {report.tracking_code}: {note}",
            )

        report.save()
        if status == CitizenReportStatus.ESCALATED:
            # An open fraud flag should flip the project to FLAGGED, exactly as a
            # QA-raised flag does; otherwise dashboards show an open flag on an
            # "unflagged" project.
            from apps.projects.services import ProjectService

            ProjectService.sync_operational_status(
                report.project,
                user=user,
                reason=f"Citizen report {report.tracking_code} escalated to a fraud flag.",
            )
        AuditService.log_event(
            event_type="CITIZEN_REPORT_TRIAGED",
            actor=user,
            project=report.project,
            action="TRIAGE",
            object_type="CitizenReport",
            object_id=str(report.id),
            before_state=before_state,
            after_state={"status": report.status, "fraud_flag": report.fraud_flag_id},
            metadata={"note": note},
        )
        return report
