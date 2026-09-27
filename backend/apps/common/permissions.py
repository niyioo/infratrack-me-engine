from rest_framework.permissions import BasePermission


HIGH_PRIVILEGE_ROLE_CODES = {"SUPER_ADMIN", "PROGRAM_DIRECTOR", "AUDITOR"}
DIRECTORY_MANAGER_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES
ANALYTICS_VIEWER_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES
PROJECT_MANAGER_ROLE_CODES = {"SUPER_ADMIN", "PROGRAM_DIRECTOR", "M_E_OFFICER"}
EVIDENCE_SUBMITTER_ROLE_CODES = {"SUPER_ADMIN", "FIELD_OFFICER", "CONTRACTOR", "M_E_OFFICER"}
PROJECT_OVERSIGHT_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES | {"QA_OFFICER", "FINANCE_OFFICER"}
QA_REVIEWER_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES | {"QA_OFFICER"}
FINANCE_REVIEWER_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES | {"FINANCE_OFFICER"}
AUDIT_REVIEWER_ROLE_CODES = HIGH_PRIVILEGE_ROLE_CODES | {"QA_OFFICER"}

ROLE_CAPABILITIES = {
    "SUPER_ADMIN": {
        "dashboard.view",
        "users.view_directory",
        "projects.view_all",
        "projects.manage",
        "projects.dispatch_alerts",
        "projects.view_lifecycle",
        "evidence.submit",
        "evidence.review_exceptions",
        "qa.review",
        "finance.review",
        "analytics.view_executive",
        "analytics.generate",
        "analytics.view_trends",
        "audits.view",
        "citizen_reports.triage",
        "fraud_flags.resolve",
        "notifications.view",
    },
    "PROGRAM_DIRECTOR": {
        "dashboard.view",
        "users.view_directory",
        "projects.view_all",
        "projects.manage",
        "projects.dispatch_alerts",
        "projects.view_lifecycle",
        "evidence.review_exceptions",
        "qa.review",
        "finance.review",
        "analytics.view_executive",
        "analytics.generate",
        "analytics.view_trends",
        "audits.view",
        "citizen_reports.triage",
        "fraud_flags.resolve",
        "notifications.view",
    },
    "AUDITOR": {
        "dashboard.view",
        "users.view_directory",
        "projects.view_all",
        "projects.view_lifecycle",
        "evidence.review_exceptions",
        "finance.review",
        "analytics.view_executive",
        "analytics.view_trends",
        "audits.view",
        "citizen_reports.triage",
        "fraud_flags.resolve",
        "notifications.view",
    },
    "M_E_OFFICER": {
        "dashboard.view",
        "projects.manage",
        "projects.dispatch_alerts",
        "projects.view_lifecycle",
        "evidence.submit",
        "qa.review",
        "analytics.generate",
        "citizen_reports.triage",
        "notifications.view",
    },
    "FIELD_OFFICER": {
        "dashboard.view",
        "evidence.submit",
        "notifications.view",
    },
    "CONTRACTOR": {
        "dashboard.view",
        "evidence.submit",
        "notifications.view",
    },
    "QA_OFFICER": {
        "dashboard.view",
        "projects.view_lifecycle",
        "evidence.review_exceptions",
        "qa.review",
        "audits.view",
        "citizen_reports.triage",
        "fraud_flags.resolve",
        "notifications.view",
    },
    "FINANCE_OFFICER": {
        "dashboard.view",
        "finance.review",
        "notifications.view",
    },
}


def get_user_role_codes(user):
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return set(user.roles.values_list("code", flat=True))


def user_has_any_role(user, allowed_roles):
    if getattr(user, "is_superuser", False):
        return True
    return bool(get_user_role_codes(user).intersection(set(allowed_roles)))


def get_user_capabilities(user):
    role_codes = get_user_role_codes(user)
    capabilities = set()
    for role_code in role_codes:
        capabilities.update(ROLE_CAPABILITIES.get(role_code, set()))
    if getattr(user, "is_superuser", False):
        capabilities.update(ROLE_CAPABILITIES.get("SUPER_ADMIN", set()))
    return capabilities


def is_project_visible_to_user(project, user):
    if getattr(user, "is_superuser", False):
        return True

    user_role_codes = get_user_role_codes(user)
    if user_role_codes.intersection(HIGH_PRIVILEGE_ROLE_CODES):
        return True

    return project.assignments.filter(user=user, is_active=True).exists()


def is_project_managed_by_user(project, user):
    if getattr(user, "is_superuser", False):
        return True

    user_role_codes = get_user_role_codes(user)
    if user_role_codes.intersection(HIGH_PRIVILEGE_ROLE_CODES):
        return True

    # A project assignment alone can't grant management rights: the user must also
    # hold a manager role globally.
    if not user_role_codes.intersection(PROJECT_MANAGER_ROLE_CODES):
        return False

    return project.assignments.filter(
        user=user,
        is_active=True,
        assignment_role__in=PROJECT_MANAGER_ROLE_CODES,
    ).exists()


class HasRolePermission(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return user_has_any_role(request.user, self.allowed_roles)


class IsProjectVisibleToUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return is_project_visible_to_user(obj, request.user)


class IsDirectoryManager(HasRolePermission):
    allowed_roles = sorted(DIRECTORY_MANAGER_ROLE_CODES)


class IsQAOfficer(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "QA_OFFICER"]


class IsFinanceOfficer(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "FINANCE_OFFICER"]


class IsFieldOrContractor(HasRolePermission):
    allowed_roles = ["SUPER_ADMIN", "FIELD_OFFICER", "CONTRACTOR", "M_E_OFFICER"]


class HasActionCapability(BasePermission):
    """
    Maps DRF view actions to explicit capability checks.

    Views can define:
    action_capability_map = {"create": ("projects.manage",)}
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "is_superuser", False):
            return True

        action_capability_map = getattr(view, "action_capability_map", {})
        required_capabilities = action_capability_map.get(getattr(view, "action", ""), ())
        if not required_capabilities:
            return True

        user_capabilities = get_user_capabilities(user)
        return bool(set(required_capabilities).intersection(user_capabilities))
