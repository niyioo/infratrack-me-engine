from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.organizations.models import Agency


def create_user(email, role_code, *, is_superuser=False, is_staff=False):
    user = User.objects.create_user(
        email=email,
        password="Password123!",
        first_name="Test",
        last_name="User",
        is_superuser=is_superuser,
        is_staff=is_staff,
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"})
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user


def test_me_endpoint_returns_current_user(db):
    client = APIClient()
    user = create_user("field@example.com", "FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.get("/api/auth/me/")

    assert response.status_code == 200
    assert response.data["email"] == user.email


def test_regular_user_cannot_list_all_users(db):
    client = APIClient()
    user = create_user("field@example.com", "FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.get("/api/users/")

    assert response.status_code == 403


def test_directory_manager_can_list_users(db):
    client = APIClient()
    create_user("field@example.com", "FIELD_OFFICER")
    manager = create_user("director@example.com", "PROGRAM_DIRECTOR")
    client.force_authenticate(user=manager)

    response = client.get("/api/users/")

    assert response.status_code == 200
    assert len(response.data) >= 1
