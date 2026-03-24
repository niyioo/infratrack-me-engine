from apps.projects.models import ProjectStatusHistory
from apps.audits.services import AuditService


class ProjectService:
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