from datetime import date, timedelta
"""
Tests for anonymous citizen reports: public API, anti-abuse, volume-based risk
escalation, and staff triage.
"""

import io
from decimal import Decimal

import pytest
from django.contrib.gis.geos import Point
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.citizen_reports.models import CitizenReport
from apps.finance.models import FundingTranche
from apps.finance.rules import TrancheEligibilityEngine
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment
from apps.qa.models import FraudFlag

REPORTS_URL = "/api/public/citizen-reports/"
DESCRIPTION = "No workers or equipment on site for the past three weeks."


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def make_user(email, role_code):
    user = User.objects.create_user(email=email, password="Password123!", first_name="Test", last_name="User")
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"})
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency


def make_project(agency, created_by, code, status="ACTIVE"):
    contractor, _ = Contractor.objects.get_or_create(
        registration_number=f"RC-{code}", defaults={"name": f"Contractor {code}"}
    )
    return Project.objects.create(
        project_code=code,
        title=f"Project {code}",
        agency=agency,
        contractor=contractor,
        supervising_department="Dept",
        category="BUILDING",
        state="Ondo",
        lga="Akure North",
        site_address="Test Site",
        site_location=Point(5.22, 7.25, srid=4326),
        geo_fence_radius_meters=100,
        budget_amount=Decimal("1000000.00"),
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        current_status=status,
        risk_status="LOW",
        created_by=created_by,
    )


def post_report(project, ip="203.0.113.10", **extra):
    payload = {"project_id": project.id, "category": "NO_ACTIVITY", "description": DESCRIPTION, **extra}
    return APIClient().post(REPORTS_URL, payload, format="multipart", REMOTE_ADDR=ip)


@pytest.fixture
def project(db):
    user, agency = make_user("owner-cr@example.com", "M_E_OFFICER")
    return make_project(agency, user, "PRJ-CR01")


def test_public_project_list_is_anonymous_minimal_and_excludes_completed(project):
    user, agency = make_user("owner-cr2@example.com", "M_E_OFFICER")
    make_project(agency, user, "PRJ-CR-DONE", status="COMPLETED")

    response = APIClient().get("/api/public/projects/", HTTP_AUTHORIZATION="Bearer stale-token")

    assert response.status_code == 200
    codes = [p["project_code"] for p in response.data["results"]]
    assert "PRJ-CR01" in codes
    assert "PRJ-CR-DONE" not in codes
    assert "budget_amount" not in response.data["results"][0]
    assert "contractor" not in response.data["results"][0]


def test_anonymous_report_returns_tracking_code_without_exposing_reporter(project):
    response = post_report(project)

    assert response.status_code == 201
    code = response.data["tracking_code"]
    assert code.startswith("CR-")
    assert "reporter_fingerprint" not in response.data

    track = APIClient().get(f"{REPORTS_URL}{code.lower()}/")
    assert track.status_code == 200
    assert track.data["status_label"] == "Received"
    assert "reporter_fingerprint" not in track.data
    assert "triage_note" not in track.data


def test_honeypot_and_completed_projects_are_rejected(project):
    assert post_report(project, website="http://spam.example").status_code == 400

    user, agency = make_user("owner-cr3@example.com", "M_E_OFFICER")
    completed = make_project(agency, user, "PRJ-CR-DONE2", status="COMPLETED")
    assert post_report(completed).status_code == 404


def test_photo_is_reencoded_and_exif_stripped(project):
    image = Image.new("RGB", (40, 40), "red")
    exif = Image.Exif()
    exif[0x010F] = "ReporterPhoneMaker"  # Make
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", exif=exif.tobytes())
    photo = SimpleUploadedFile("site.jpg", buffer.getvalue(), content_type="image/jpeg")

    response = post_report(project, photo=photo)

    assert response.status_code == 201
    report = CitizenReport.objects.get(tracking_code=response.data["tracking_code"])
    with report.photo.open("rb") as stored:
        assert not Image.open(stored).getexif()


def test_non_image_photo_is_rejected(project):
    fake = SimpleUploadedFile("site.jpg", b"<html>not an image</html>", content_type="image/jpeg")
    assert post_report(project, photo=fake).status_code == 400


def test_distinct_reporters_raise_risk_without_creating_fraud_flag(project):
    for i in range(3):
        assert post_report(project, ip=f"198.51.100.{i}").status_code == 201

    project.refresh_from_db()
    assert project.risk_status == "HIGH"
    # Anonymous volume alone must never block payments.
    assert not FraudFlag.objects.filter(project=project).exists()


def test_single_source_cannot_inflate_risk(project):
    for _ in range(3):
        assert post_report(project, ip="198.51.100.77").status_code == 201
    fourth = post_report(project, ip="198.51.100.77")

    assert fourth.status_code == 400  # per-project daily limit
    project.refresh_from_db()
    assert project.risk_status == "LOW"


def test_positive_updates_do_not_raise_risk(project):
    for i in range(3):
        post_report(project, ip=f"198.51.100.{i + 20}", category="PROGRESS_UPDATE")

    project.refresh_from_db()
    assert project.risk_status == "LOW"


def test_escalation_creates_fraud_flag_that_blocks_tranche(project):
    qa_user, _ = make_user("qa-cr@example.com", "QA_OFFICER")
    tranche = FundingTranche.objects.create(
        project=project, tranche_number=1, tranche_name="T1", planned_amount=Decimal("100000.00")
    )
    report_id = CitizenReport.objects.get(tracking_code=post_report(project).data["tracking_code"]).id

    client = APIClient()
    client.force_authenticate(user=qa_user)

    no_note = client.post(f"/api/citizen-reports/{report_id}/triage/", {"status": "ESCALATED"}, format="json")
    assert no_note.status_code == 400

    response = client.post(
        f"/api/citizen-reports/{report_id}/triage/",
        {"status": "ESCALATED", "note": "Site visit confirms no activity.", "public_response": "Under investigation."},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["fraud_flag"] is not None
    result = TrancheEligibilityEngine.evaluate(tranche)
    assert "Project has unresolved fraud flags." in result["rules_failed"]
    project.refresh_from_db()
    assert project.current_status == "FLAGGED"


def test_field_officer_and_contractor_cannot_see_citizen_reports(project):
    post_report(project)
    for role in ("FIELD_OFFICER", "CONTRACTOR"):
        user, _ = make_user(f"{role.lower()}-cr@example.com", role)
        ProjectAssignment.objects.create(project=project, user=user, assignment_role=role)
        client = APIClient()
        client.force_authenticate(user=user)
        assert client.get("/api/citizen-reports/").status_code == 403


def test_closed_report_cannot_be_retriaged(project):
    qa_user, _ = make_user("qa-cr2@example.com", "QA_OFFICER")
    report_id = CitizenReport.objects.get(tracking_code=post_report(project).data["tracking_code"]).id
    client = APIClient()
    client.force_authenticate(user=qa_user)

    client.post(
        f"/api/citizen-reports/{report_id}/triage/", {"status": "DISMISSED", "note": "Duplicate."}, format="json"
    )
    reopen = client.post(f"/api/citizen-reports/{report_id}/triage/", {"status": "UNDER_REVIEW"}, format="json")

    assert reopen.status_code == 400


def test_dashboard_and_project_detail_expose_citizen_signals_to_triage_roles_only(project):
    for i in range(2):
        post_report(project, ip=f"198.51.100.{i + 40}")
    post_report(project, ip="198.51.100.60", category="PROGRESS_UPDATE")

    qa_user, _ = make_user("qa-signals@example.com", "QA_OFFICER")
    ProjectAssignment.objects.create(project=project, user=qa_user, assignment_role="QA_OFFICER")
    qa = APIClient()
    qa.force_authenticate(user=qa_user)

    summary = qa.get("/api/project-metric-snapshots/dashboard-summary/").data["citizen_reports"]
    assert summary == {"open": 3, "escalated": 0, "new_last_7_days": 3}

    detail = qa.get(f"/api/projects/{project.id}/").data["citizen_reports"]
    assert detail["total"] == 3
    # Positive updates don't count towards escalation.
    assert detail["distinct_concern_reporters"] == 2
    assert detail["high_threshold"] == 3
    assert len(detail["recent_open"]) == 3
    assert "reporter_fingerprint" not in detail["recent_open"][0]

    for role in ("CONTRACTOR", "FIELD_OFFICER"):
        user, _ = make_user(f"{role.lower()}-signals@example.com", role)
        ProjectAssignment.objects.create(project=project, user=user, assignment_role=role)
        client = APIClient()
        client.force_authenticate(user=user)
        assert client.get("/api/project-metric-snapshots/dashboard-summary/").data["citizen_reports"] is None
        assert client.get(f"/api/projects/{project.id}/").data["citizen_reports"] is None


def test_retry_with_same_client_key_returns_the_original_report(project):
    key = "k" * 10 + "Zq7_-Lp2wX9mN4"
    first = post_report(project, client_key=key)
    # Mobile networks often change the phone's IP between attempts.
    retry = post_report(project, ip="198.51.100.77", client_key=key)

    assert first.status_code == 201
    assert retry.status_code == 200
    assert retry.data["tracking_code"] == first.data["tracking_code"]
    assert CitizenReport.objects.filter(project=project).count() == 1


def test_different_client_keys_create_separate_reports(project):
    a = post_report(project, client_key="a" * 24)
    b = post_report(project, client_key="b" * 24)

    assert a.status_code == b.status_code == 201
    assert a.data["tracking_code"] != b.data["tracking_code"]


@pytest.mark.parametrize("bad_key", ["short", "has spaces in it ok", "x" * 65, "semi;colon-key-1234"])
def test_malformed_client_key_is_rejected(project, bad_key):
    response = post_report(project, client_key=bad_key)

    assert response.status_code == 400
    assert not CitizenReport.objects.exists()
