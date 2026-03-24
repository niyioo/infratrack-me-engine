from django.db import models
from apps.common.constants import MilestoneStatus


class MilestoneTemplate(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, blank=True)
    default_evidence_type = models.CharField(max_length=50, default="PHOTO")
    default_required_evidence_count = models.PositiveIntegerField(default=1)
    default_qa_required = models.BooleanField(default=True)
    default_requires_field_validation = models.BooleanField(default=False)
    default_tolerance_rules_json = models.JSONField(default=dict, blank=True)
    sequence_order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProjectMilestone(models.Model):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="milestones")
    template = models.ForeignKey(MilestoneTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sequence_order = models.PositiveIntegerField()
    expected_evidence_type = models.CharField(max_length=50, default="PHOTO")
    required_evidence_count = models.PositiveIntegerField(default=1)
    required_video_count = models.PositiveIntegerField(default=0)
    qa_required = models.BooleanField(default=True)
    requires_field_validation = models.BooleanField(default=False)
    required_checklist_score = models.PositiveIntegerField(default=70)
    target_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    current_status = models.CharField(
        max_length=50, choices=MilestoneStatus.choices, default=MilestoneStatus.PENDING
    )
    approval_sequence_json = models.JSONField(default=list, blank=True)
    tolerance_rules_json = models.JSONField(default=dict, blank=True)
    linked_tranche = models.OneToOneField(
        "finance.FundingTranche",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_milestone",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sequence_order"]
        unique_together = ("project", "sequence_order")


class MilestoneDependency(models.Model):
    project_milestone = models.ForeignKey(
        ProjectMilestone, on_delete=models.CASCADE, related_name="dependencies"
    )
    depends_on_milestone = models.ForeignKey(
        ProjectMilestone, on_delete=models.CASCADE, related_name="dependents"
    )
    dependency_type = models.CharField(max_length=50, default="FINISH_TO_START")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project_milestone", "depends_on_milestone")


class MilestoneChecklistItem(models.Model):
    project_milestone = models.ForeignKey(
        ProjectMilestone, on_delete=models.CASCADE, related_name="checklist_items"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    max_score = models.PositiveIntegerField(default=10)
    sort_order = models.PositiveIntegerField(default=1)