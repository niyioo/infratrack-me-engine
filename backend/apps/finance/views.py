from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.finance.models import FundingTranche, TrancheEligibilitySnapshot, Disbursement
from apps.finance.serializers import (
    FundingTrancheSerializer,
    TrancheEligibilitySnapshotSerializer,
    DisbursementSerializer,
    DisbursementCreateSerializer,
)
from apps.finance.services import FinanceService


class FundingTrancheViewSet(viewsets.ModelViewSet):
    queryset = FundingTranche.objects.select_related("project").all()
    serializer_class = FundingTrancheSerializer
    filterset_fields = ["project", "current_status", "tranche_number"]

    @action(detail=True, methods=["post"])
    def evaluate(self, request, pk=None):
        tranche = self.get_object()
        result = FinanceService.evaluate_tranche(tranche)
        return Response(result)

    @action(detail=True, methods=["post"])
    def disburse(self, request, pk=None):
        tranche = self.get_object()
        serializer = DisbursementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        disbursement = FinanceService.disburse_tranche(
            tranche=tranche,
            released_by_user=request.user,
            payment_reference=serializer.validated_data["payment_reference"],
            note=serializer.validated_data.get("note", ""),
        )
        return Response(DisbursementSerializer(disbursement).data, status=status.HTTP_201_CREATED)


class TrancheEligibilitySnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TrancheEligibilitySnapshot.objects.all()
    serializer_class = TrancheEligibilitySnapshotSerializer


class DisbursementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Disbursement.objects.all()
    serializer_class = DisbursementSerializer