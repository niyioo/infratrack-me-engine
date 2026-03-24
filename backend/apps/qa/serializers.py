from rest_framework import serializers
from apps.qa.models import QAReview, QAReviewItem, FraudFlag


class QAReviewItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QAReviewItem
        fields = "__all__"


class QAReviewSerializer(serializers.ModelSerializer):
    items = QAReviewItemSerializer(many=True, read_only=True)

    class Meta:
        model = QAReview
        fields = "__all__"


class QAReviewCreateSerializer(serializers.Serializer):
    evidence_submission_id = serializers.IntegerField()
    decision = serializers.CharField()
    comments = serializers.CharField(required=False, allow_blank=True)
    item_scores = serializers.ListField(child=serializers.DictField(), allow_empty=True)


class FraudFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraudFlag
        fields = "__all__"