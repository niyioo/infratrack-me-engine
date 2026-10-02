from rest_framework import serializers
from apps.accounts.models import User, Role
from apps.organizations.models import Agency
from apps.common.permissions import get_user_capabilities


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "code", "name", "description"]


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.CharField(read_only=True)
    capabilities = serializers.SerializerMethodField()
    role_assignments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "is_active", "is_staff", "roles", "role_assignments", "capabilities", "created_at"
        ]

    def get_capabilities(self, obj):
        return sorted(get_user_capabilities(obj))

    def get_role_assignments(self, obj):
        return [
            {
                "role_id": user_role.role_id,
                "role_code": user_role.role.code,
                "role_name": user_role.role.name,
                "agency_id": user_role.agency_id,
                "agency_name": user_role.agency.name if user_role.agency else None,
            }
            for user_role in obj.user_roles.all()
        ]


class UserRoleAssignmentSerializer(serializers.Serializer):
    role_id = serializers.PrimaryKeyRelatedField(source="role", queryset=Role.objects.all())
    agency_id = serializers.PrimaryKeyRelatedField(
        source="agency",
        queryset=Agency.objects.all(),
        required=False,
        allow_null=True,
    )


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    role_assignments = UserRoleAssignmentSerializer(many=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "is_active",
            "is_staff",
            "password",
            "role_assignments",
        ]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a user."})
        return attrs

    def _sync_role_assignments(self, user, assignments):
        if assignments is None:
            return

        assigned_by = self.context["request"].user if self.context.get("request") else None
        user.user_roles.all().delete()
        user.roles.clear()
        for assignment in assignments:
            user.user_roles.create(
                role=assignment["role"],
                agency=assignment.get("agency"),
                assigned_by=assigned_by,
            )

    def create(self, validated_data):
        assignments = validated_data.pop("role_assignments", [])
        password = validated_data.pop("password")
        request = self.context.get("request")
        if not getattr(getattr(request, "user", None), "is_superuser", False):
            validated_data["is_staff"] = False

        user = User.objects.create_user(password=password, **validated_data)
        self._sync_role_assignments(user, assignments)
        return user

    def update(self, instance, validated_data):
        assignments = validated_data.pop("role_assignments", None)
        password = validated_data.pop("password", None)
        request = self.context.get("request")
        if not getattr(getattr(request, "user", None), "is_superuser", False):
            validated_data.pop("is_staff", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        self._sync_role_assignments(instance, assignments)
        return instance
