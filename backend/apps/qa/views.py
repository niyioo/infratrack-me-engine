from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.qa.models import QAReview, FraudFlag
from apps.qa.serializers import QAReviewSerializer, QAReviewCreateSerializer, FraudFlagSerializer
from apps.qa.services import QAService
from apps.evidence.models import EvidenceSubmission


class QAReviewViewSet(viewsets.ModelViewSet):
    queryset = QAReview.objects.prefetch_related("items").all()
    serializer_class = QAReviewSerializer
    filterset_fields = ["project", "milestone", "decision", "reviewer"]

    def create(self, request, *args, **kwargs):
        serializer = QAReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = EvidenceSubmission.objects.get(id=serializer.validated_data["evidence_submission_id"])
        review = QAService.review_submission(
            reviewer=request.user,
            submission=submission,
            decision=serializer.validated_data["decision"],
            comments=serializer.validated_data.get("comments", ""),
            item_scores=serializer.validated_data.get("item_scores", []),
        )
        return Response(QAReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class FraudFlagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FraudFlag.objects.all()
    serializer_class = FraudFlagSerializer