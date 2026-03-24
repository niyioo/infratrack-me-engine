from django.contrib import admin
from apps.milestones.models import (
    MilestoneTemplate,
    ProjectMilestone,
    MilestoneDependency,
    MilestoneChecklistItem,
)

admin.site.register(MilestoneTemplate)
admin.site.register(ProjectMilestone)
admin.site.register(MilestoneDependency)
admin.site.register(MilestoneChecklistItem)