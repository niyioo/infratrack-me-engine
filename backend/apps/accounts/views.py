from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import User, Role
from apps.accounts.serializers import UserSerializer, RoleSerializer, UserWriteSerializer
from apps.common.permissions import IsDirectoryManager


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().prefetch_related("roles", "user_roles__agency", "user_roles__role")
    permission_classes = [IsDirectoryManager]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UserWriteSerializer
        return UserSerializer


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsDirectoryManager]


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
