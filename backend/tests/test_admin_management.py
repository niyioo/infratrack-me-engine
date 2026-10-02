from datetime import date, timedelta
from rest_framework.test import APIClient
from django.contrib.gis.geos import Point

from apps.accounts.models import Role, User, UserRole
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project


def create_user(email, role_code, *, is_superuser=False, is_staff=False):
    user = User.objects.create_user(
        email=email,
        password="Password123!",
        first_name="Admin",
        last_name="User",
        is_superuser=is_superuser,
        is_staff=is_staff,
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(
        code=f"AG-{role_code}",
        defaults={"name": role_code, "type": "Ministry"},
    )
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency, role


def test_directory_manager_can_create_user_with_role_assignment(db):
    client = APIClient()
    manager, agency, _ = create_user("director@example.com", "PROGRAM_DIRECTOR")
    field_role, _ = Role.objects.get_or_create(code="FIELD_OFFICER", defaults={"name": "Field Officer"})
    client.force_authenticate(user=manager)

    response = client.post(
        "/api/users/",
        {
            "email": "newfield@example.com",
            "first_name": "New",
            "last_name": "Officer",
            "phone": "08000000000",
            "password": "Password123!",
            "is_active": True,
            "role_assignments": [
                {
                    "role_id": field_role.id,
                    "agency_id": agency.id,
                }
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    created = User.objects.get(email="newfield@example.com")
    assert created.user_roles.filter(role=field_role, agency=agency).exists()


def test_regular_user_cannot_create_user(db):
    client = APIClient()
    user, _, _ = create_user("field@example.com", "FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/users/",
        {
            "email": "blocked@example.com",
            "first_name": "Blocked",
            "last_name": "User",
            "password": "Password123!",
        },
        format="json",
    )

    assert response.status_code == 403


def test_project_creation_requires_management_capability(db):
    client = APIClient()
    user, agency, _ = create_user("field@example.com", "FIELD_OFFICER")
    contractor = Contractor.objects.create(name="BuildCo", registration_number="RC-100")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/projects/",
        {
            "project_code": "PRJ-001",
            "title": "Community Road Upgrade",
            "description": "Road project",
            "agency": agency.id,
            "contractor": contractor.id,
            "supervising_department": "Infrastructure",
            "category": "Roads",
            "sector": "Transport",
            "state": "Ondo",
            "lga": "Akure South",
            "ward": "Ward 1",
            "site_address": "1 Civic Centre Road",
            "latitude": 7.25,
            "longitude": 5.21,
            "geo_fence_radius_meters": 50,
            "budget_amount": "1000000.00",
            "currency": "NGN",
            "funding_cycle": "2026",
            "start_date": (date.today() - timedelta(days=90)).isoformat(),
            "expected_end_date": (date.today() + timedelta(days=180)).isoformat(),
            "current_status": "NOT_STARTED",
            "risk_status": "LOW",
            "requires_independent_validation": True,
        },
        format="json",
    )

    assert response.status_code == 403
    assert Project.objects.count() == 0


def test_project_manager_can_create_project(db):
    client = APIClient()
    manager, agency, _ = create_user("me@example.com", "M_E_OFFICER")
    contractor = Contractor.objects.create(name="BuildCo", registration_number="RC-101")
    client.force_authenticate(user=manager)

    response = client.post(
        "/api/projects/",
        {
            "project_code": "PRJ-002",
            "title": "Primary Health Centre",
            "description": "Health project",
            "agency": agency.id,
            "contractor": contractor.id,
            "supervising_department": "Health",
            "category": "Healthcare",
            "sector": "Health",
            "state": "Ondo",
            "lga": "Akure North",
            "ward": "Ward 2",
            "site_address": "2 Medical Way",
            "latitude": 7.30,
            "longitude": 5.24,
            "geo_fence_radius_meters": 80,
            "budget_amount": "1200000.00",
            "currency": "NGN",
            "funding_cycle": "2026",
            "start_date": (date.today() - timedelta(days=90)).isoformat(),
            "expected_end_date": (date.today() + timedelta(days=180)).isoformat(),
            "current_status": "NOT_STARTED",
            "risk_status": "LOW",
            "requires_independent_validation": True,
        },
        format="json",
    )

    assert response.status_code == 201
    project = Project.objects.get(project_code="PRJ-002")
    assert project.created_by == manager
    assert project.assignments.filter(user=manager, assignment_role="M_E_OFFICER", is_active=True).exists()


def test_non_manager_cannot_update_project_even_when_assigned(db):
    client = APIClient()
    manager, agency, _ = create_user("manager@example.com", "M_E_OFFICER")
    contractor = Contractor.objects.create(name="BuildCo", registration_number="RC-102")
    project = Project.objects.create(
        project_code="PRJ-003",
        title="Assigned Upgrade",
        description="Assigned project",
        agency=agency,
        contractor=contractor,
        supervising_department="Infrastructure",
        category="Roads",
        sector="Transport",
        state="Ondo",
        lga="Akure South",
        ward="Ward 3",
        site_address="3 Civic Centre Road",
        site_location=Point(5.21, 7.25, srid=4326),
        geo_fence_radius_meters=50,
        budget_amount="1000000.00",
        currency="NGN",
        funding_cycle="2026",
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        current_status="NOT_STARTED",
        risk_status="LOW",
        requires_independent_validation=True,
        created_by=manager,
    )
    project.assignments.create(
        user=manager,
        assignment_role="M_E_OFFICER",
        assigned_by=manager,
        is_active=True,
    )
    field_user, _, _ = create_user("assigned-field@example.com", "FIELD_OFFICER")
    project.assignments.create(
        user=field_user,
        assignment_role="FIELD_OFFICER",
        assigned_by=manager,
        is_active=True,
    )

    client.force_authenticate(user=field_user)
    response = client.patch(
        f"/api/projects/{project.id}/",
        {"title": "Unauthorized Edit"},
        format="json",
    )

    assert response.status_code == 403
    project.refresh_from_db()
    assert project.title == "Assigned Upgrade"


def test_non_manager_cannot_delete_project_even_when_assigned(db):
    client = APIClient()
    manager, agency, _ = create_user("manager-delete@example.com", "M_E_OFFICER")
    contractor = Contractor.objects.create(name="BuildCo", registration_number="RC-103")
    project = Project.objects.create(
        project_code="PRJ-004",
        title="Delete Guard",
        description="Delete guard project",
        agency=agency,
        contractor=contractor,
        supervising_department="Infrastructure",
        category="Roads",
        sector="Transport",
        state="Ondo",
        lga="Akure South",
        ward="Ward 4",
        site_address="4 Civic Centre Road",
        site_location=Point(5.22, 7.26, srid=4326),
        geo_fence_radius_meters=50,
        budget_amount="1000000.00",
        currency="NGN",
        funding_cycle="2026",
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        current_status="NOT_STARTED",
        risk_status="LOW",
        requires_independent_validation=True,
        created_by=manager,
    )
    project.assignments.create(
        user=manager,
        assignment_role="M_E_OFFICER",
        assigned_by=manager,
        is_active=True,
    )
    field_user, _, _ = create_user("assigned-delete@example.com", "FIELD_OFFICER")
    project.assignments.create(
        user=field_user,
        assignment_role="FIELD_OFFICER",
        assigned_by=manager,
        is_active=True,
    )

    client.force_authenticate(user=field_user)
    response = client.delete(f"/api/projects/{project.id}/")

    assert response.status_code == 403
    assert Project.objects.filter(id=project.id).exists()


def test_regular_user_cannot_create_agency(db):
    client = APIClient()
    user, _, _ = create_user("field2@example.com", "FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/agencies/",
        {
            "name": "Works Ministry",
            "code": "AG-WORKS",
            "type": "Ministry",
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == 403
