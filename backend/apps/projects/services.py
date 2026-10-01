from django.utils import timezone
from apps.common.constants import MilestoneStatus, ProjectStatus, SubmissionStatus
from apps.projects.models import ProjectLifecycleEvent, ProjectStatusHistory
from apps.audits.services import AuditService


class ProjectService:
    MANUAL_PROJECT_STATUSES = {
        ProjectStatus.AWAITING_VERIFICATION,
        ProjectStatus.APPROVED_FOR_FUNDING,
        ProjectStatus.SUSPENDED,
    }
    LIFECYCLE_STAGE_MAP = {
        ProjectStatus.NOT_STARTED: "INITIATED",
        ProjectStatus.ACTIVE: "IN_PROGRESS",
        ProjectStatus.DELAYED: "IN_PROGRESS",
        ProjectStatus.FLAGGED: "IN_PROGRESS",
        ProjectStatus.SUSPENDED: "APPROVED",
        ProjectStatus.AWAITING_VERIFICATION: "VERIFIED_PENDING",
        ProjectStatus.APPROVED_FOR_FUNDING: "FUNDED",
        ProjectStatus.COMPLETED: "COMPLETED",
    }

    @staticmethod
    def lifecycle_stage_for_status(status):
        return ProjectService.LIFECYCLE_STAGE_MAP.get(status, "INITIATED")

    @staticmethod
    def record_lifecycle_event(project, *, status=None, user=None, note="", event_type="ENTERED_STAGE", metadata=None):
        source_status = status or project.current_status
        stage = ProjectService.lifecycle_stage_for_status(source_status)
        latest_event = project.lifecycle_events.order_by("-created_at").first()
        if latest_event and latest_event.stage == stage and latest_event.source_status == source_status:
            return latest_event

        lifecycle_event = ProjectLifecycleEvent.objects.create(
            project=project,
            stage=stage,
            event_type=event_type,
            source_status=source_status,
            note=note,
            metadata_json=metadata or {},
            created_by=user,
        )

        AuditService.log_event(
            event_type="PROJECT_LIFECYCLE_EVENT_RECORDED",
            actor=user,
            project=project,
            action="lifecycle_event",
            object_type="ProjectLifecycleEvent",
            object_id=str(lifecycle_event.id),
            after_state=AuditService.snapshot_model(
                lifecycle_event,
                fields=["id", "stage", "event_type", "source_status", "note", "metadata_json"],
            ),
            metadata={"stage": stage, "source_status": source_status},
        )
        return lifecycle_event

    @staticmethod
    def change_status(project, to_status, user, reason=""):
        from_status = project.current_status
        project.current_status = to_status
        project.save(update_fields=["current_status", "updated_at"])

        ProjectStatusHistory.objects.create(
            project=project,
            from_status=from_status,
            to_status=to_status,
            changed_by=user,
            reason=reason,
        )

        AuditService.log_event(
            event_type="PROJECT_STATUS_CHANGED",
            actor=user,
            project=project,
            action="status_change",
            object_type="Project",
            object_id=str(project.id),
            before_state={"current_status": from_status},
            after_state={"current_status": to_status},
            metadata={"reason": reason},
        )
        ProjectService.record_lifecycle_event(
            project,
            status=to_status,
            user=user,
            note=reason or "Project status changed manually.",
            event_type="STATUS_CHANGE",
            metadata={"from_status": from_status, "to_status": to_status},
        )

    @staticmethod
    def sync_operational_status(project, user=None, reason=""):
        status = ProjectService._sync_status(project, user=user, reason=reason)
        ProjectService.refresh_metrics(project)
        return status

    @staticmethod
    def refresh_metrics(project):
        # Local import: analytics.services imports projects.models.
        from apps.analytics.services import AnalyticsService

        return AnalyticsService.refresh_project_metrics(project)

    @staticmethod
    def _sync_status(project, user=None, reason=""):
        if project.current_status in ProjectService.MANUAL_PROJECT_STATUSES:
            return project.current_status

        milestones = project.milestones.all()
        today = timezone.localdate()
        total_milestones = milestones.count()

        if project.fraud_flags.filter(status="OPEN").exists() or milestones.filter(
            current_status=MilestoneStatus.FLAGGED
        ).exists():
            target_status = ProjectStatus.FLAGGED
        elif total_milestones > 0 and not milestones.exclude(current_status=MilestoneStatus.APPROVED).exists():
            target_status = ProjectStatus.COMPLETED
        elif milestones.filter(due_date__lt=today).exclude(current_status=MilestoneStatus.APPROVED).exists():
            target_status = ProjectStatus.DELAYED
        elif milestones.exclude(current_status=MilestoneStatus.PENDING).exists() or project.evidence_submissions.exclude(
            submission_status=SubmissionStatus.DRAFT
        ).exists():
            target_status = ProjectStatus.ACTIVE
        else:
            target_status = ProjectStatus.NOT_STARTED

        updates = []
        from_status = project.current_status

        if target_status == ProjectStatus.COMPLETED and project.actual_end_date is None:
            project.actual_end_date = today
            updates.append("actual_end_date")
        elif target_status != ProjectStatus.COMPLETED and project.current_status == ProjectStatus.COMPLETED and project.actual_end_date:
            project.actual_end_date = None
            updates.append("actual_end_date")

        if target_status != project.current_status:
            project.current_status = target_status
            updates.append("current_status")

        if not updates:
            return project.current_status

        project.save(update_fields=[*updates, "updated_at"])

        if "current_status" in updates:
            ProjectStatusHistory.objects.create(
                project=project,
                from_status=from_status,
                to_status=target_status,
                changed_by=user,
                reason=reason or "Project status synchronized from milestone/evidence state.",
            )

            AuditService.log_event(
                event_type="PROJECT_STATUS_SYNCED",
                actor=user,
                project=project,
                action="status_sync",
                object_type="Project",
                object_id=str(project.id),
                before_state={"current_status": from_status},
                after_state={"current_status": target_status},
                metadata={"reason": reason or "Operational lifecycle synchronization."},
            )
            ProjectService.record_lifecycle_event(
                project,
                status=target_status,
                user=user,
                note=reason or "Project lifecycle synchronized from operational state.",
                event_type="STATUS_SYNC",
                metadata={"from_status": from_status, "to_status": target_status},
            )

        return project.current_status
