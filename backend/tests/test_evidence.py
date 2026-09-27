from datetime import date, timedelta

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.evidence.models import EvidenceSubmission, GeoFenceExceptionRequest
from apps.milestones.models import ProjectMilestone
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment


def create_user(email, role_code):
    user = User.objects.create_user(
        email=email,
        password="Password123!",
        first_name="Test",
        last_name="User",
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"})
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency


def create_project(*, agency, created_by, code, title, lng=5.22, lat=7.25):
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
        site_location=Point(lng, lat, srid=4326),
        geo_fence_radius_meters=50,
        budget_amount=1000,
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        created_by=created_by,
    )


def create_milestone(project, sequence_order):
    return ProjectMilestone.objects.create(
        project=project,
        name=f"Milestone {sequence_order}",
        sequence_order=sequence_order,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        # Relative so the milestone never becomes overdue (which would flip the project to DELAYED).
        due_date=date.today() + timedelta(days=60),
    )


def build_payload(project_id, milestone_id, *, latitude=7.25, longitude=5.22):
    return {
        "project_id": project_id,
        "milestone_id": milestone_id,
        "source_type": "FIELD_OFFICER",
        "latitude": latitude,
        "longitude": longitude,
        "files": [SimpleUploadedFile("evidence.jpg", b"fake-image-content", content_type="image/jpeg")],
    }


def test_evidence_submission_idempotency_key_replays_existing_submission(db):
    client = APIClient()
    user, agency = create_user("field-idem@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-IDEM", title="Project Idempotent")
    milestone = create_milestone(project, 1)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FIELD_OFFICER")
    client.force_authenticate(user=user)

    first_response = client.post(
        "/api/evidence-submissions/",
        {
            **build_payload(project.id, milestone.id),
            "idempotency_key": "idem-project-1",
        },
        format="multipart",
    )
    second_response = client.post(
        "/api/evidence-submissions/",
        {
            **build_payload(project.id, milestone.id),
            "idempotency_key": "idem-project-1",
        },
        format="multipart",
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 200
    assert first_response.data["id"] == second_response.data["id"]
    assert EvidenceSubmission.objects.filter(
        submitted_by_user=user,
        idempotency_key="idem-project-1",
    ).count() == 1


def test_evidence_submission_rejects_mismatched_milestone(db):
    client = APIClient()
    user, agency = create_user("field@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-1", title="Project One")
    other_project = create_project(agency=agency, created_by=user, code="PRJ-2", title="Project Two")
    milestone = create_milestone(other_project, 1)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.post("/api/evidence-submissions/", build_payload(project.id, milestone.id), format="multipart")

    assert response.status_code == 400
    assert "milestone_id" in response.data


def test_evidence_submission_rejects_unassigned_user(db):
    client = APIClient()
    user, agency = create_user("field@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-3", title="Project Three")
    milestone = create_milestone(project, 1)
    client.force_authenticate(user=user)

    response = client.post("/api/evidence-submissions/", build_payload(project.id, milestone.id), format="multipart")

    assert response.status_code == 403


def test_evidence_submission_returns_400_when_outside_geofence(db):
    client = APIClient()
    user, agency = create_user("field@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-4", title="Project Four")
    milestone = create_milestone(project, 1)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/evidence-submissions/",
        build_payload(project.id, milestone.id, latitude=0.0, longitude=0.0),
        format="multipart",
    )

    assert response.status_code == 400
    assert "detail" in response.data
    assert "submission_id" in response.data
    submission_id = response.data["submission_id"]

    exception_request = GeoFenceExceptionRequest.objects.get(submission_id=submission_id)
    assert exception_request.project_id == project.id
    assert exception_request.milestone_id == milestone.id
    assert exception_request.status == "PENDING"


def test_qa_officer_can_approve_geofence_exception_and_sync_submission(db):
    field_client = APIClient()
    reviewer_client = APIClient()

    field_user, agency = create_user("field2@example.com", "FIELD_OFFICER")
    qa_user, _ = create_user("qa@example.com", "QA_OFFICER")

    project = create_project(agency=agency, created_by=field_user, code="PRJ-5", title="Project Five")
    milestone = create_milestone(project, 1)
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

    field_client.force_authenticate(user=field_user)
    blocked_response = field_client.post(
        "/api/evidence-submissions/",
        build_payload(project.id, milestone.id, latitude=0.0, longitude=0.0),
        format="multipart",
    )

    assert blocked_response.status_code == 400
    submission_id = blocked_response.data["submission_id"]
    exception_request = GeoFenceExceptionRequest.objects.get(submission_id=submission_id)

    reviewer_client.force_authenticate(user=qa_user)
    approve_response = reviewer_client.post(
        f"/api/geofence-exceptions/{exception_request.id}/approve/",
        {"decision_note": "Reviewed and accepted due to legitimate field conditions."},
        format="json",
    )

    assert approve_response.status_code == 200

    exception_request.refresh_from_db()
    exception_submission = exception_request.submission
    exception_submission.refresh_from_db()
    project.refresh_from_db()

    assert exception_request.status == "APPROVED"
    assert exception_request.reviewed_by_id == qa_user.id
    assert exception_submission.geo_validation_status == "EXCEPTION_APPROVED"
    assert exception_submission.submission_status == "SUBMITTED"
    assert exception_submission.requires_exception_review is False
    assert project.current_status == "ACTIVE"
