from apps.common.constants import MilestoneStatus


class MilestoneDependencyRuleService:
    @staticmethod
    def dependencies_satisfied(milestone):
        deps = milestone.dependencies.select_related("depends_on_milestone").all()
        for dep in deps:
            if dep.depends_on_milestone.current_status != MilestoneStatus.APPROVED:
                return False
        return True