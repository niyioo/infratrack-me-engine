"""The fixed set of roles Civitness's permissions are written against (see
apps.common.permissions.ROLE_CAPABILITIES)."""

SYSTEM_ROLES = [
    ("SUPER_ADMIN", "Super Admin"),
    ("PROGRAM_DIRECTOR", "Program Director"),
    ("M_E_OFFICER", "M&E Officer"),
    ("FIELD_OFFICER", "Field Officer"),
    ("CONTRACTOR", "Contractor"),
    ("QA_OFFICER", "QA Officer"),
    ("FINANCE_OFFICER", "Finance Officer"),
    ("AUDITOR", "Auditor"),
]


def ensure_system_roles():
    from apps.accounts.models import Role

    return {code: Role.objects.get_or_create(code=code, defaults={"name": name})[0] for code, name in SYSTEM_ROLES}
