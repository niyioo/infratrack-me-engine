from rest_framework import viewsets
from apps.organizations.models import Agency, Contractor
from apps.organizations.serializers import AgencySerializer, ContractorSerializer


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    filterset_fields = ["type", "is_active"]
    search_fields = ["name", "code"]


class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    filterset_fields = ["is_active", "risk_level"]
    search_fields = ["name", "registration_number"]