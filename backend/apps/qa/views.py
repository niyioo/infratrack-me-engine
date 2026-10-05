from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.qa.models import QAReview, FraudFlag
from apps.qa.serializers import (
    FraudFlagResolveSerializer,
    FraudFlagSerializer,
    QAReviewCreateSerializer,
    QAReviewSerializer,
)
from apps.qa.services import FraudFlagError, FraudFlagService, QAReviewError, QAService
from apps.evidence.models import EvidenceSubmission
from apps.common.permissions import (
    PROJECT_OVERSIGHT_ROLE_CODES,
    QA_REVIEWER_ROLE_CODES,
    IsQAOfficer,
    get_user_capabilities,
    get_user_role_codes,
)
from apps.common.pagination import OptionalPaginationMixin


class QAReviewViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    queryset = QAReview.objects.select_related(
        "project",
        "milestone",
        "evidence_submission",
        "reviewer",
    ).prefetch_related("items").all()
    serializer_class = QAReviewSerializer
    filterset_fields = ["project", "milestone", "decision", "reviewer"]
    # QA decisions are part of the audit trail and cannot be edited or deleted.
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsQAOfficer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(QA_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()

    def create(self, request, *args, **kwargs):
        serializer = QAReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission = get_object_or_404(EvidenceSubmission, id=serializer.validated_data["evidence_submission_id"])
        if not submission.project.assignments.filter(user=request.user, is_active=True).exists() and not request.user.is_superuser:
            user_roles = get_user_role_codes(request.user)
            if not user_roles.intersection(QA_REVIEWER_ROLE_CODES):
                raise PermissionDenied("You do not have access to review this submission.")

        try:
            review = QAService.review_submission(
                reviewer=request.user,
                submission=submission,
                decision=serializer.validated_data["decision"],
                comments=serializer.validated_data.get("comments", ""),
                item_scores=serializer.validated_data.get("item_scores", []),
            )
        except QAReviewError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(QAReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class FraudFlagViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FraudFlag.objects.select_related(
        "project", "milestone", "evidence_submission", "flagged_by", "resolved_by"
    ).all()
    serializer_class = FraudFlagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "milestone", "status", "severity"]

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        if "fraud_flags.resolve" not in get_user_capabilities(request.user):
            raise PermissionDenied("You do not have permission to resolve fraud flags.")
        flag = self.get_object()
        serializer = FraudFlagResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            flag = FraudFlagService.resolve(
                flag=flag,
                user=request.user,
                resolution=serializer.validated_data["resolution"],
                note=serializer.validated_data["note"],
            )
        except FraudFlagError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(FraudFlagSerializer(self.get_queryset().get(pk=flag.pk)).data)

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(PROJECT_OVERSIGHT_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()
