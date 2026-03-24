from rest_framework.permissions import BasePermission


class HasRolePermission(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        user_role_codes = set(request.user.roles.values_list("code", flat=True))
        return bool(user_role_codes.intersection(set(self.allowed_roles)))


class IsProjectVisibleToUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        user_role_codes = set(request.user.roles.values_list("code", flat=True))

        if user_role_codes.intersection({"SUPER_ADMIN", "PROGRAM_DIRECTOR", "AUDITOR"}):
            return True

        if obj.assignments.filter(user=request.user, is_active=True).exists():
            return True

        return False


class IsQAOfficer(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "QA_OFFICER"]


class IsFinanceOfficer(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "FINANCE_OFFICER"]


class IsFieldOrContractor(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "FIELD_OFFICER", "CONTRACTOR", "M_E_OFFICER"]