from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers
from apps.finance.models import FundingTranche, TrancheEligibilitySnapshot, Disbursement


class FundingTrancheSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    project_status = serializers.CharField(source="project.current_status", read_only=True)

    class Meta:
        model = FundingTranche
        fields = [
            "id",
            "project",
            "project_code",
            "project_title",
            "project_status",
            "tranche_number",
            "tranche_name",
            "planned_amount",
            "percentage_of_budget",
            "planned_release_date",
            "actual_release_date",
            "current_status",
            "unlock_status",
            "unlock_reason",
            "released_by",
            "release_reference",
            "created_at",
        ]
        # Status and release fields are owned by FinanceService (evaluate/disburse).
        read_only_fields = [
            "current_status",
            "unlock_status",
            "unlock_reason",
            "actual_release_date",
            "released_by",
            "release_reference",
        ]

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and "project" in attrs and attrs["project"] != instance.project:
            raise serializers.ValidationError({"project": "A tranche cannot be moved to another project."})

        project = attrs.get("project", getattr(instance, "project", None))
        planned_amount = attrs.get("planned_amount", getattr(instance, "planned_amount", None))
        if planned_amount is not None and planned_amount <= 0:
            raise serializers.ValidationError({"planned_amount": "Planned amount must be greater than zero."})

        if project is not None and planned_amount is not None:
            other_tranches = project.tranches.all()
            if instance is not None:
                other_tranches = other_tranches.exclude(pk=instance.pk)
            committed = other_tranches.aggregate(total=Sum("planned_amount"))["total"] or Decimal("0")
            if committed + planned_amount > project.budget_amount:
                raise serializers.ValidationError(
                    {"planned_amount": "Total tranche amounts cannot exceed the project budget."}
                )
        return attrs


class TrancheEligibilitySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrancheEligibilitySnapshot
        fields = [
            "id",
            "tranche",
            "evaluated_at",
            "is_eligible",
            "rules_passed_json",
            "rules_failed_json",
            "evaluated_by_system",
            "snapshot_hash",
        ]


class DisbursementSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    tranche_name = serializers.CharField(source="tranche.tranche_name", read_only=True)

    class Meta:
        model = Disbursement
        fields = [
            "id",
            "tranche",
            "project",
            "project_code",
            "project_title",
            "tranche_name",
            "amount",
            "released_by_user",
            "authorized_by_user",
            "release_date",
            "payment_reference",
            "note",
            "source_of_authority",
        ]


class DisbursementCreateSerializer(serializers.Serializer):
    payment_reference = serializers.CharField(max_length=255, trim_whitespace=True)
    note = serializers.CharField(required=False, allow_blank=True)
