"""
Stored project metrics, the portfolio map endpoint, and project reports/exports.
"""

import csv
import io
from datetime import date, timedelta

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.analytics.services import AnalyticsService
from apps.audits.models import AuditEvent
from apps.citizen_reports.models import CitizenReport, CitizenReportCategory
from apps.common.constants import MilestoneStatus
from apps.projects.models import Project, ProjectAssignment
from apps.projects.services import ProjectService
from tests.test_qa_finance import make_milestone, make_project, make_user


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def make_citizen_report(project, n, **extra):
    return CitizenReport.objects.create(
        project=project,
        category=CitizenReportCategory.NO_ACTIVITY,
        description="No workers or equipment on site for weeks.",
        tracking_code=f"TST{n:05d}",
        reporter_fingerprint=f"{n:064d}",
        **extra,
    )


# ---------------------------------------------------------------------------
# Stored metrics
# ---------------------------------------------------------------------------


def test_status_sync_stores_health_and_list_api_returns_it(db):
    director, agency = make_user("dir-metrics@example.com", "PROGRAM_DIRECTOR")
    project = make_project(agency=agency, created_by=director, code="PRJ-MET-01")
    make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    make_milestone(project, 2, status=MilestoneStatus.OPEN_FOR_SUBMISSION)

    ProjectService.sync_operational_status(project)

    project.refresh_from_db()
    assert project.health_score is not None
    assert project.health_band == AnalyticsService.health_band(project.health_score)
    assert float(project.physical_completion_percent) == 50.0
    assert project.metrics_refreshed_at is not None

    response = client_for(director).get("/api/projects/")
    rows = response.data["results"] if isinstance(response.data, dict) else response.data
    row = next(r for r in rows if r["id"] == project.id)
    assert row["health_score"] == project.health_score
    assert float(row["physical_completion_percent"]) == 50.0


def test_clients_cannot_write_stored_metrics(db):
    director, agency = make_user("dir-write@example.com", "PROGRAM_DIRECTOR")
    project = make_project(agency=agency, created_by=director, code="PRJ-MET-02")
    ProjectAssignment.objects.create(project=project, user=director, assignment_role="M_E_OFFICER")
    ProjectService.sync_operational_status(project)
    project.refresh_from_db()
    real_score = project.health_score

    response = client_for(director).patch(
        f"/api/projects/{project.id}/",
        {"health_score": 100, "health_band": "HEALTHY", "physical_completion_percent": "99.00"},
        format="json",
    )

    assert response.status_code == 200
    project.refresh_from_db()
    assert project.health_score == real_score
    assert float(project.physical_completion_percent) == 0.0


def test_completed_project_delay_stops_at_its_end_date(db):
    director, agency = make_user("dir-delay@example.com", "PROGRAM_DIRECTOR")
    project = make_project(agency=agency, created_by=director, code="PRJ-MET-03")
    today = date.today()
    Project.objects.filter(pk=project.pk).update(
        expected_end_date=today - timedelta(days=100),
        actual_end_date=today - timedelta(days=90),
    )
    project.refresh_from_db()

    values = AnalyticsService._calculate_snapshot_values(project)

    assert values["delayed_days"] == 10


# ---------------------------------------------------------------------------
# Portfolio map
# ---------------------------------------------------------------------------


def test_map_shows_only_assigned_projects_and_no_citizen_reports_to_field_staff(db):
    field_user, agency = make_user("field-map@example.com", "FIELD_OFFICER")
    mine = make_project(agency=agency, created_by=field_user, code="PRJ-MAP-01")
    other = make_project(agency=agency, created_by=field_user, code="PRJ-MAP-02")
    ProjectAssignment.objects.create(project=mine, user=field_user, assignment_role="FIELD_OFFICER")
    make_citizen_report(mine, 1, latitude=7.25, longitude=5.22)

    response = client_for(field_user).get("/api/project-metric-snapshots/portfolio-map/")

    assert response.status_code == 200
    assert [p["id"] for p in response.data["projects"]] == [mine.id]
    assert other.id not in [p["id"] for p in response.data["projects"]]
    assert response.data["citizen_reports"] is None
    assert "open_citizen_reports" not in response.data["projects"][0]


def test_map_gives_triage_roles_report_pins_without_reporter_details(db):
    qa_user, agency = make_user("qa-map@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=qa_user, code="PRJ-MAP-03")
    ProjectAssignment.objects.create(project=project, user=qa_user, assignment_role="QA_OFFICER")
    make_citizen_report(project, 2, latitude=7.2503, longitude=5.2204)
    make_citizen_report(project, 3)  # no coordinates: counted, not plotted

    response = client_for(qa_user).get("/api/project-metric-snapshots/portfolio-map/")

    assert response.status_code == 200
    assert response.data["projects"][0]["open_citizen_reports"] == 2
    pins = response.data["citizen_reports"]
    assert len(pins) == 1
    assert pins[0]["latitude"] == 7.2503
    assert "reporter_fingerprint" not in pins[0] and "photo" not in pins[0]


# ---------------------------------------------------------------------------
# Reports and exports
# ---------------------------------------------------------------------------


def test_project_report_is_a_fingerprinted_pdf_and_is_audited(db):
    auditor, agency = make_user("auditor-report@example.com", "AUDITOR")
    project = make_project(agency=agency, created_by=auditor, code="PRJ-REP-01")
    make_milestone(project, 1)

    response = client_for(auditor).get(f"/api/projects/{project.id}/report/")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert "PRJ-REP-01" in response["Content-Disposition"]
    fingerprint = response["X-Report-Fingerprint"]
    assert len(fingerprint) == 64
    event = AuditEvent.objects.get(event_type="PROJECT_REPORT_EXPORTED", project=project)
    assert event.metadata_json["fingerprint"] == fingerprint


def test_field_officer_cannot_export_reports(db):
    field_user, agency = make_user("field-report@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-REP-02")
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")
    client = client_for(field_user)

    assert client.get(f"/api/projects/{project.id}/report/").status_code == 403
    assert client.get("/api/projects/export/").status_code == 403


def test_report_hides_citizen_signals_from_roles_without_triage(db):
    from apps.projects.reports import collect_project_report

    finance_user, agency = make_user("fin-report@example.com", "FINANCE_OFFICER")
    qa_user, _ = make_user("qa-report@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=finance_user, code="PRJ-REP-03")
    make_citizen_report(project, 4)

    assert collect_project_report(project, user=finance_user)["citizen_reports"] is None
    assert collect_project_report(project, user=qa_user)["citizen_reports"]["open"] == 1


def test_portfolio_csv_export_escapes_formula_cells(db):
    director, agency = make_user("dir-export@example.com", "PROGRAM_DIRECTOR")
    make_project(agency=agency, created_by=director, code="PRJ-EXP-01")
    risky = make_project(agency=agency, created_by=director, code="PRJ-EXP-02")
    Project.objects.filter(pk=risky.pk).update(title="=HYPERLINK(\"http://evil\")")

    response = client_for(director).get("/api/projects/export/", {"search": "PRJ-EXP"})

    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert rows[0][0] == "Project code"
    titles = {row[0]: row[1] for row in rows[1:]}
    assert set(titles) == {"PRJ-EXP-01", "PRJ-EXP-02"}
    assert titles["PRJ-EXP-02"].startswith("'=")
    assert AuditEvent.objects.filter(event_type="PROJECT_PORTFOLIO_EXPORTED").exists()


def test_health_judges_progress_against_plan(db):
    director, agency = make_user("dir-plan@example.com", "PROGRAM_DIRECTOR")
    project = make_project(agency=agency, created_by=director, code="PRJ-PLAN-01")
    today = date.today()

    # Not started yet: nothing is expected, so zero completion isn't a problem.
    Project.objects.filter(pk=project.pk).update(
        start_date=today + timedelta(days=10), expected_end_date=today + timedelta(days=110)
    )
    project.refresh_from_db()
    assert AnalyticsService.expected_progress_percent(project) == 0
    not_started = AnalyticsService.health_from_values(AnalyticsService._calculate_snapshot_values(project))
    assert AnalyticsService.health_band(not_started) == "HEALTHY"

    # Half-way through the timeline with nothing approved: behind plan.
    Project.objects.filter(pk=project.pk).update(
        start_date=today - timedelta(days=50), expected_end_date=today + timedelta(days=50)
    )
    project.refresh_from_db()
    assert AnalyticsService.expected_progress_percent(project) == 50
    behind = AnalyticsService.health_from_values(AnalyticsService._calculate_snapshot_values(project))
    assert behind < not_started
    assert AnalyticsService.health_band(behind) != "HEALTHY"


def test_hourly_snapshot_task_still_stores_snapshots(db):
    director, agency = make_user("dir-snap@example.com", "PROGRAM_DIRECTOR")
    project = make_project(agency=agency, created_by=director, code="PRJ-SNAP-01")

    snapshot = AnalyticsService.calculate_project_snapshot(project)

    assert snapshot.pk
    project.refresh_from_db()
    assert project.health_score is not None
