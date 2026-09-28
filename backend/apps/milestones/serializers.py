from rest_framework import serializers
from apps.common.constants import MilestoneStatus
from apps.milestones.models import (
    MilestoneTemplate, ProjectMilestone, MilestoneDependency, MilestoneChecklistItem
)

MANAGER_SETTABLE_STATUSES = {MilestoneStatus.PENDING, MilestoneStatus.OPEN_FOR_SUBMISSION}


class MilestoneChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneChecklistItem
        fields = ["id", "project_milestone", "title", "description", "is_required", "max_score", "sort_order"]


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    checklist_items = MilestoneChecklistItemSerializer(many=True, read_only=True)
    # Annotated by ProjectMilestoneViewSet; omitted where the annotation is absent.
    submitted_evidence_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProjectMilestone
        fields = [
            "id",
            "project",
            "template",
            "name",
            "description",
            "sequence_order",
            "expected_evidence_type",
            "required_evidence_count",
            "required_video_count",
            "qa_required",
            "requires_field_validation",
            "required_checklist_score",
            "target_date",
            "due_date",
            "completed_date",
            "current_status",
            "approval_sequence_json",
            "tolerance_rules_json",
            "linked_tranche",
            "created_at",
            "updated_at",
            "checklist_items",
            "submitted_evidence_count",
        ]
        read_only_fields = ["completed_date"]

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and "project" in attrs and attrs["project"] != instance.project:
            raise serializers.ValidationError({"project": "A milestone cannot be moved to another project."})

        if "current_status" in attrs:
            new_status = attrs["current_status"]
            current = getattr(instance, "current_status", MilestoneStatus.PENDING)
            # Outcome states (SUBMITTED, APPROVED, REJECTED, ...) are set only by the
            # evidence and QA workflows, so managers can't approve a milestone directly.
            if new_status != current and (
                new_status not in MANAGER_SETTABLE_STATUSES or current not in MANAGER_SETTABLE_STATUSES
            ):
                raise serializers.ValidationError(
                    {"current_status": "This status can only be changed through the evidence/QA workflow."}
                )

        project = attrs.get("project", getattr(instance, "project", None))
        linked_tranche = attrs.get("linked_tranche")
        if linked_tranche is not None and project is not None and linked_tranche.project_id != project.id:
            raise serializers.ValidationError({"linked_tranche": "Tranche belongs to a different project."})
        return attrs


class MilestoneTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneTemplate
        fields = [
            "id",
            "name",
            "code",
            "category",
            "default_evidence_type",
            "default_required_evidence_count",
            "default_qa_required",
            "default_requires_field_validation",
            "default_tolerance_rules_json",
            "sequence_order",
            "is_active",
            "created_at",
        ]


class MilestoneDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = MilestoneDependency
        fields = ["id", "project_milestone", "depends_on_milestone", "dependency_type", "created_at"]
