from rest_framework import permissions, viewsets
from apps.organizations.models import Agency, Contractor
from apps.organizations.serializers import AgencySerializer, ContractorSerializer
from apps.common.permissions import HasActionCapability


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    action_capability_map = {
        "list": ("users.view_directory", "projects.manage"),
        "retrieve": ("users.view_directory", "projects.manage"),
        "create": ("users.view_directory",),
        "update": ("users.view_directory",),
        "partial_update": ("users.view_directory",),
        "destroy": ("users.view_directory",),
    }
    filterset_fields = ["type", "is_active"]
    search_fields = ["name", "code"]


class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    permission_classes = [permissions.IsAuthenticated, HasActionCapability]
    action_capability_map = {
        "list": ("users.view_directory", "projects.manage"),
        "retrieve": ("users.view_directory", "projects.manage"),
        "create": ("users.view_directory",),
        "update": ("users.view_directory",),
        "partial_update": ("users.view_directory",),
        "destroy": ("users.view_directory",),
    }
    filterset_fields = ["is_active", "risk_level"]
    search_fields = ["name", "registration_number"]
