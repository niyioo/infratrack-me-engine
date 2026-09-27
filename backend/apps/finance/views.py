from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.audits.services import AuditService
from apps.common.constants import TrancheStatus
from apps.finance.models import FundingTranche, TrancheEligibilitySnapshot, Disbursement
from apps.finance.serializers import (
    FundingTrancheSerializer,
    TrancheEligibilitySnapshotSerializer,
    DisbursementSerializer,
    DisbursementCreateSerializer,
)
from apps.finance.services import FinanceService
from apps.common.permissions import FINANCE_REVIEWER_ROLE_CODES, HasActionCapability, IsFinanceOfficer, get_user_role_codes
from apps.common.pagination import OptionalPaginationMixin
from apps.common.throttles import FinanceActionThrottle


class FundingTrancheViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    queryset = FundingTranche.objects.select_related("project", "released_by").all()
    serializer_class = FundingTrancheSerializer
    filterset_fields = ["project", "current_status", "tranche_number"]
    action_capability_map = {
        "create": ("finance.review",),
        "update": ("finance.review",),
        "partial_update": ("finance.review",),
        "destroy": ("finance.review",),
        "evaluate": ("finance.review",),
        "disburse": ("finance.review",),
    }

    def get_permissions(self):
        if self.action in self.action_capability_map:
            return [permissions.IsAuthenticated(), HasActionCapability(), IsFinanceOfficer()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        if self.action in {"evaluate", "disburse"}:
            return [FinanceActionThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(FINANCE_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()

    def _audit_fields(self):
        return ["id", "project", "tranche_number", "tranche_name", "planned_amount", "percentage_of_budget", "current_status"]

    def perform_create(self, serializer):
        tranche = serializer.save()
        AuditService.log_event(
            event_type="TRANCHE_CREATED",
            actor=self.request.user,
            project=tranche.project,
            tranche=tranche,
            action="CREATE",
            object_type="FundingTranche",
            object_id=str(tranche.id),
            after_state=AuditService.snapshot_model(tranche, fields=self._audit_fields()),
            request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.current_status == TrancheStatus.DISBURSED or instance.disbursements.exists():
            raise PermissionDenied("A disbursed tranche cannot be modified.")
        before_state = AuditService.snapshot_model(instance, fields=self._audit_fields())
        amount_changed = (
            "planned_amount" in serializer.validated_data
            and serializer.validated_data["planned_amount"] != instance.planned_amount
        )
        tranche = serializer.save()
        if amount_changed and tranche.current_status == TrancheStatus.ELIGIBLE:
            # A changed amount invalidates any prior eligibility decision.
            tranche.current_status = TrancheStatus.LOCKED
            tranche.unlock_status = TrancheStatus.LOCKED
            tranche.unlock_reason = "Planned amount changed; re-evaluation required."
            tranche.save(update_fields=["current_status", "unlock_status", "unlock_reason"])
        AuditService.log_event(
            event_type="TRANCHE_UPDATED",
            actor=self.request.user,
            project=tranche.project,
            tranche=tranche,
            action="UPDATE",
            object_type="FundingTranche",
            object_id=str(tranche.id),
            before_state=before_state,
            after_state=AuditService.snapshot_model(tranche, fields=self._audit_fields()),
            request=self.request,
        )

    def perform_destroy(self, instance):
        if instance.current_status == TrancheStatus.DISBURSED or instance.disbursements.exists():
            raise PermissionDenied("A disbursed tranche cannot be deleted.")
        before_state = AuditService.snapshot_model(instance, fields=self._audit_fields())
        project, tranche_id = instance.project, instance.id
        instance.delete()
        AuditService.log_event(
            event_type="TRANCHE_DELETED",
            actor=self.request.user,
            project=project,
            action="DELETE",
            object_type="FundingTranche",
            object_id=str(tranche_id),
            before_state=before_state,
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def evaluate(self, request, pk=None):
        tranche = self.get_object()
        result = FinanceService.evaluate_tranche(tranche, evaluated_by_user=request.user)
        return Response(result)

    @action(detail=True, methods=["post"])
    def disburse(self, request, pk=None):
        tranche = self.get_object()
        serializer = DisbursementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            disbursement = FinanceService.disburse_tranche(
                tranche=tranche,
                released_by_user=request.user,
                payment_reference=serializer.validated_data["payment_reference"],
                note=serializer.validated_data.get("note", ""),
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(DisbursementSerializer(disbursement).data, status=status.HTTP_201_CREATED)


class TrancheEligibilitySnapshotViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = TrancheEligibilitySnapshot.objects.all()
    serializer_class = TrancheEligibilitySnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(FINANCE_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(tranche__project__assignments__user=user, tranche__project__assignments__is_active=True).distinct()


class DisbursementViewSet(OptionalPaginationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Disbursement.objects.select_related("project", "tranche", "released_by_user", "authorized_by_user").all()
    serializer_class = DisbursementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset

        user_roles = get_user_role_codes(user)
        if user_roles.intersection(FINANCE_REVIEWER_ROLE_CODES):
            return self.queryset.distinct()

        return self.queryset.filter(project__assignments__user=user, project__assignments__is_active=True).distinct()
