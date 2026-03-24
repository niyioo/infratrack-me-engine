from apps.common.constants import MilestoneStatus
from apps.milestones.rules import MilestoneDependencyRuleService
from apps.audits.services import AuditService


class MilestoneService:
    @staticmethod
    def open_for_submission(milestone, user):
        if not MilestoneDependencyRuleService.dependencies_satisfied(milestone):
            raise ValueError("Cannot open milestone. Dependencies not satisfied.")

        previous = milestone.current_status
        milestone.current_status = MilestoneStatus.OPEN_FOR_SUBMISSION
        milestone.save(update_fields=["current_status", "updated_at"])

        AuditService.log_event(
            event_type="MILESTONE_OPENED",
            actor=user,
            project=milestone.project,
            milestone=milestone,
            action="open_for_submission",
            object_type="ProjectMilestone",
            object_id=str(milestone.id),
            before_state={"current_status": previous},
            after_state={"current_status": milestone.current_status},
        )