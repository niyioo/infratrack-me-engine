from rest_framework import serializers
from apps.common.constants import QAReviewDecision
from apps.qa.models import QAReview, QAReviewItem, FraudFlag


class QAReviewItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QAReviewItem
        fields = ["id", "qa_review", "checklist_item", "score_awarded", "passed", "comment"]


class QAReviewSerializer(serializers.ModelSerializer):
    items = QAReviewItemSerializer(many=True, read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.full_name", read_only=True)
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    milestone_name = serializers.CharField(source="milestone.name", read_only=True)
    submission_status = serializers.CharField(source="evidence_submission.submission_status", read_only=True)

    class Meta:
        model = QAReview
        fields = [
            "id",
            "project",
            "milestone",
            "evidence_submission",
            "reviewer",
            "reviewer_name",
            "project_code",
            "project_title",
            "milestone_name",
            "submission_status",
            "review_stage",
            "decision",
            "total_score",
            "max_score",
            "comments",
            "fraud_suspected",
            "rework_required",
            "reviewed_at",
            "created_at",
            "items",
        ]


class QAReviewItemScoreSerializer(serializers.Serializer):
    checklist_item_id = serializers.IntegerField()
    score_awarded = serializers.IntegerField(min_value=0)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class QAReviewCreateSerializer(serializers.Serializer):
    evidence_submission_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=QAReviewDecision.choices)
    comments = serializers.CharField(required=False, allow_blank=True, default="")
    item_scores = QAReviewItemScoreSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        # Rejections and fraud flags must carry a reason for the audit trail.
        if attrs["decision"] != QAReviewDecision.APPROVED and not attrs.get("comments", "").strip():
            raise serializers.ValidationError({"comments": "A comment is required for this decision."})
        return attrs


class FraudFlagSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source="project.project_code", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    milestone_name = serializers.CharField(source="milestone.name", read_only=True)
    flagged_by_name = serializers.CharField(source="flagged_by.full_name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.full_name", read_only=True, default=None)

    class Meta:
        model = FraudFlag
        fields = [
            "id",
            "project",
            "project_code",
            "project_title",
            "milestone",
            "milestone_name",
            "flagged_by_name",
            "resolved_by_name",
            "evidence_submission",
            "flagged_by",
            "flag_type",
            "severity",
            "description",
            "status",
            "resolved_by",
            "resolved_at",
            "resolution_note",
            "created_at",
        ]


class FraudFlagResolveSerializer(serializers.Serializer):
    resolution = serializers.ChoiceField(choices=["RESOLVED", "DISMISSED"])
    note = serializers.CharField(max_length=2000, trim_whitespace=True)
