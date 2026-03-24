from rest_framework import viewsets, permissions
from apps.accounts.models import User, Role
from apps.accounts.serializers import UserSerializer, RoleSerializer


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().prefetch_related("roles")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]