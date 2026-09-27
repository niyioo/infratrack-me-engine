from datetime import date, timedelta
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.milestones.models import ProjectMilestone
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment


def create_user(email, role_code):
    user = User.objects.create_user(
        email=email,
        password="Password123!",
        first_name="Project",
        last_name="Tester",
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"})
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency


def create_project(*, agency, created_by, code, title, start_date=date.today() - timedelta(days=90), expected_end_date=date.today() + timedelta(days=180)):
    contractor, _ = Contractor.objects.get_or_create(
        registration_number=f"RC-{code}",
        defaults={"name": f"Contractor {code}"},
    )
    return Project.objects.create(
        project_code=code,
        title=title,
        agency=agency,
        contractor=contractor,
        supervising_department="Dept",
        category="BUILDING",
        sector="HEALTH",
        state="Ondo",
        lga="Akure North",
        site_address="Site Address",
        site_location=Point(5.22, 7.25, srid=4326),
        geo_fence_radius_meters=50,
        budget_amount=1000,
        start_date=start_date,
        expected_end_date=expected_end_date,
        created_by=created_by,
    )


def create_milestone(project, sequence_order, *, status="PENDING", due_date=date.today() + timedelta(days=60)):
    return ProjectMilestone.objects.create(
        project=project,
        name=f"Milestone {sequence_order}",
        sequence_order=sequence_order,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        due_date=due_date,
        current_status=status,
    )


def test_me_officer_can_list_agencies_for_project_setup(db):
    client = APIClient()
    user, _ = create_user("me-officer@example.com", "M_E_OFFICER")
    Agency.objects.get_or_create(code="AG-CORE", defaults={"name": "Core Agency", "type": "Ministry"})
    client.force_authenticate(user=user)

    response = client.get("/api/agencies/")

    assert response.status_code == 200
    assert len(response.data) >= 1


def test_project_detail_includes_operational_summary(db):
    client = APIClient()
    user, agency = create_user("project-detail@example.com", "M_E_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-DETAIL", title="Project Detail")
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="M_E_OFFICER")
    create_milestone(project, 1, status="APPROVED")
    create_milestone(project, 2, status="PENDING")
    client.force_authenticate(user=user)

    response = client.get(f"/api/projects/{project.id}/")

    assert response.status_code == 200
    assert "health_score" in response.data
    assert "health_band" in response.data
    assert response.data["total_milestones"] == 2
    assert response.data["approved_milestones"] == 1
    assert "alerts" in response.data


def test_projects_list_supports_optional_pagination(db):
    client = APIClient()
    user, agency = create_user("pagination@example.com", "M_E_OFFICER")
    project_one = create_project(agency=agency, created_by=user, code="PRJ-P1", title="Paginated One")
    project_two = create_project(agency=agency, created_by=user, code="PRJ-P2", title="Paginated Two")
    ProjectAssignment.objects.create(project=project_one, user=user, assignment_role="M_E_OFFICER")
    ProjectAssignment.objects.create(project=project_two, user=user, assignment_role="M_E_OFFICER")
    client.force_authenticate(user=user)

    response = client.get("/api/projects/?page=1&page_size=1")

    assert response.status_code == 200
    assert response.data["count"] >= 2
    assert len(response.data["results"]) == 1


def test_dashboard_summary_exposes_reporting_compliance_queue(db):
    client = APIClient()
    user, agency = create_user("compliance@example.com", "M_E_OFFICER")
    project = create_project(
        agency=agency,
        created_by=user,
        code="PRJ-COMP",
        title="Compliance Project",
        start_date=date.today() - timedelta(days=365),
        expected_end_date=date.today() + timedelta(days=180),
    )
    project.reporting_frequency = "MONTHLY"
    project.save(update_fields=["reporting_frequency"])
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="M_E_OFFICER")
    client.force_authenticate(user=user)

    response = client.get("/api/project-metric-snapshots/dashboard-summary/")

    assert response.status_code == 200
    assert any(item["id"] == project.id for item in response.data["compliance_queue"])


def test_project_detail_exposes_reporting_compliance_fields(db):
    client = APIClient()
    user, agency = create_user("project-compliance-detail@example.com", "M_E_OFFICER")
    project = create_project(
        agency=agency,
        created_by=user,
        code="PRJ-RPT",
        title="Reporting Detail Project",
        start_date=date.today() - timedelta(days=365),
        expected_end_date=date.today() + timedelta(days=180),
    )
    project.reporting_frequency = "MONTHLY"
    project.save(update_fields=["reporting_frequency"])
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="M_E_OFFICER")
    client.force_authenticate(user=user)

    response = client.get(f"/api/projects/{project.id}/")

    assert response.status_code == 200
    assert response.data["reporting_attention_reason"] in {"REPORT_OVERDUE", "REPORT_DUE_SOON"}
    assert response.data["reporting_due_date"] is not None
