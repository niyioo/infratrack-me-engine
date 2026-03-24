from rest_framework import serializers
from apps.finance.models import FundingTranche, TrancheEligibilitySnapshot, Disbursement


class FundingTrancheSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingTranche
        fields = "__all__"


class TrancheEligibilitySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrancheEligibilitySnapshot
        fields = "__all__"


class DisbursementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disbursement
        fields = "__all__"


class DisbursementCreateSerializer(serializers.Serializer):
    payment_reference = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)