from datetime import date, timedelta
from datetime import timedelta
from unittest.mock import patch

from django.contrib.gis.geos import Point
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.analytics.models import PortfolioMetricSnapshot, ProjectMetricSnapshot
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog
from apps.milestones.models import ProjectMilestone
from apps.finance.models import FundingTranche
from apps.notifications.models import Notification
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment, ProjectLifecycleEvent


def create_user(email, role_code, *, is_superuser=False):
    user = User.objects.create_user(
        email=email,
        password="Password123!",
        first_name="Test",
        last_name="User",
        is_superuser=is_superuser,
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"})
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency


def create_project(*, agency, created_by, code, title, status="ACTIVE", lng=5.22, lat=7.25):
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
        current_status=status,
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        created_by=created_by,
    )


def create_snapshot(project, *, physical=50, financial=40, delayed_days=0, flagged_count=0):
    return ProjectMetricSnapshot.objects.create(
        project=project,
        snapshot_date=timezone.now().date(),
        physical_completion_percent=physical,
        financial_disbursement_percent=financial,
        burn_variance_percent=financial - physical,
        delayed_days=delayed_days,
        risk_score=25,
        flagged_count=flagged_count,
        approved_milestones=1,
        total_milestones=2,
    )


def create_overdue_milestone(project, sequence_order):
    return ProjectMilestone.objects.create(
        project=project,
        name=f"Milestone {sequence_order}",
        sequence_order=sequence_order,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        due_date=timezone.now().date() - timedelta(days=7),
    )


def test_notifications_are_scoped_to_recipient_and_can_be_marked_read(db):
    client = APIClient()
    recipient, _ = create_user("recipient@example.com", "FIELD_OFFICER")
    other_user, _ = create_user("other@example.com", "FIELD_OFFICER")

    owned_notification = Notification.objects.create(
        recipient=recipient,
        title="Owned",
        message="Visible to recipient",
    )
    hidden_notification = Notification.objects.create(
        recipient=other_user,
        title="Hidden",
        message="Should not be visible",
    )

    client.force_authenticate(user=recipient)

    list_response = client.get("/api/notifications/")

    assert list_response.status_code == 200
    assert len(list_response.data) == 1
    assert list_response.data[0]["id"] == owned_notification.id

    unread_response = client.get("/api/notifications/unread-count/")
    assert unread_response.status_code == 200
    assert unread_response.data["count"] == 1

    mark_response = client.post(f"/api/notifications/{owned_notification.id}/mark-read/")
    assert mark_response.status_code == 200

    owned_notification.refresh_from_db()
    assert owned_notification.is_read is True

    foreign_response = client.post(f"/api/notifications/{hidden_notification.id}/mark-read/")
    assert foreign_response.status_code == 404


def test_mark_all_notifications_read_only_updates_current_users_items(db):
    client = APIClient()
    recipient, _ = create_user("recipient2@example.com", "FIELD_OFFICER")
    other_user, _ = create_user("other2@example.com", "FIELD_OFFICER")

    Notification.objects.create(recipient=recipient, title="A", message="A")
    Notification.objects.create(recipient=recipient, title="B", message="B")
    Notification.objects.create(recipient=other_user, title="C", message="C")

    client.force_authenticate(user=recipient)

    response = client.post("/api/notifications/mark-all-read/")

    assert response.status_code == 200
    assert response.data["updated"] == 2
    assert Notification.objects.filter(recipient=recipient, is_read=True).count() == 2
    assert Notification.objects.filter(recipient=other_user, is_read=False).count() == 1


def test_dashboard_summary_only_counts_projects_visible_to_current_user(db):
    client = APIClient()
    field_user, agency = create_user("field-summary@example.com", "FIELD_OFFICER")
    manager, _ = create_user("manager-summary@example.com", "PROGRAM_DIRECTOR")

    visible_project = create_project(agency=agency, created_by=manager, code="PRJ-S1", title="Visible Project")
    hidden_project = create_project(agency=agency, created_by=manager, code="PRJ-S2", title="Hidden Project")

    ProjectAssignment.objects.create(project=visible_project, user=field_user, assignment_role="FIELD_OFFICER")
    create_overdue_milestone(visible_project, 1)
    create_overdue_milestone(hidden_project, 1)
    create_snapshot(visible_project, delayed_days=7)
    create_snapshot(hidden_project, delayed_days=4)

    client.force_authenticate(user=field_user)
    response = client.get("/api/project-metric-snapshots/dashboard-summary/")

    assert response.status_code == 200
    assert response.data["total_projects"] == 1
    assert response.data["active_projects"] == 1
    assert len(response.data["map_projects"]) == 1
    assert response.data["map_projects"][0]["project_code"] == "PRJ-S1"
    assert response.data["alert_summary"]["delayed_milestones"] == 1
    assert len(response.data["latest_snapshots"]) == 1


def test_project_manager_can_dispatch_alerts_but_field_officer_cannot(db):
    manager_client = APIClient()
    field_client = APIClient()

    manager, agency = create_user("me@example.com", "M_E_OFFICER")
    field_user, _ = create_user("field-alert@example.com", "FIELD_OFFICER")
    director, _ = create_user("director-alert@example.com", "PROGRAM_DIRECTOR")

    project = create_project(
        agency=agency,
        created_by=manager,
        code="PRJ-A1",
        title="Alert Project",
        status="AWAITING_VERIFICATION",
    )
    project.requires_independent_validation = True
    project.save(update_fields=["requires_independent_validation"])

    ProjectAssignment.objects.create(project=project, user=manager, assignment_role="M_E_OFFICER")
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")
    create_overdue_milestone(project, 1)

    field_client.force_authenticate(user=field_user)
    forbidden_response = field_client.post(f"/api/projects/{project.id}/dispatch-alerts/")

    assert forbidden_response.status_code == 403

    manager_client.force_authenticate(user=manager)
    allowed_response = manager_client.post(f"/api/projects/{project.id}/dispatch-alerts/")

    assert allowed_response.status_code == 200
    assert allowed_response.data["notifications_created"] >= 3
    assert any(alert["code"] == "DELAYED_MILESTONES" for alert in allowed_response.data["alerts"])
    assert Notification.objects.filter(recipient=director).exists()


def test_unassigned_user_cannot_generate_project_snapshot(db):
    client = APIClient()
    owner, agency = create_user("owner@example.com", "M_E_OFFICER")
    outsider, _ = create_user("outsider@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=owner, code="PRJ-G1", title="Generation Project")

    client.force_authenticate(user=outsider)
    response = client.post(f"/api/project-metric-snapshots/generate/{project.id}/")

    assert response.status_code == 403


def test_project_snapshot_generation_can_be_queued(db):
    client = APIClient()
    owner, agency = create_user("owner-queued@example.com", "M_E_OFFICER")
    project = create_project(agency=agency, created_by=owner, code="PRJ-Q1", title="Queued Snapshot Project")
    ProjectAssignment.objects.create(project=project, user=owner, assignment_role="M_E_OFFICER")

    client.force_authenticate(user=owner)

    with patch("apps.analytics.views.generate_project_snapshot_task.delay") as delay_mock:
        response = client.post(f"/api/project-metric-snapshots/generate/{project.id}/", {"queue": True}, format="json")

    assert response.status_code == 202
    assert response.data["queued"] is True
    delay_mock.assert_called_once_with(project.id)


def test_project_alert_dispatch_can_be_queued(db):
    client = APIClient()
    manager, agency = create_user("manager-queued@example.com", "M_E_OFFICER")
    project = create_project(agency=agency, created_by=manager, code="PRJ-Q2", title="Queued Alerts Project")
    ProjectAssignment.objects.create(project=project, user=manager, assignment_role="M_E_OFFICER")

    client.force_authenticate(user=manager)

    with patch("apps.projects.views.dispatch_project_alerts_task.delay") as delay_mock:
        response = client.post(f"/api/projects/{project.id}/dispatch-alerts/", {"queue": True}, format="json")

    assert response.status_code == 202
    assert response.data["queued"] is True
    delay_mock.assert_called_once_with(project.id)


def test_dashboard_summary_uses_precomputed_portfolio_snapshot_for_executive_roles(db):
    client = APIClient()
    director, agency = create_user("director-dashboard@example.com", "PROGRAM_DIRECTOR")
    create_project(agency=agency, created_by=director, code="PRJ-P1", title="Portfolio One", status="ACTIVE")
    create_project(agency=agency, created_by=director, code="PRJ-P2", title="Portfolio Two", status="DELAYED")

    snapshot_date = timezone.now().date()
    PortfolioMetricSnapshot.objects.create(
        snapshot_date=snapshot_date,
        scope_type="GLOBAL",
        total_projects=9,
        active_projects=4,
        flagged_projects_count=2,
        delayed_projects_count=3,
        total_budget="99999.00",
        awaiting_verification_count=1,
        completed_projects_count=2,
        high_risk_projects_count=5,
        independent_validation_required_count=6,
        delayed_milestones_count=7,
        unresolved_fraud_flags_count=3,
        geofence_exceptions_pending_count=2,
    )

    client.force_authenticate(user=director)
    response = client.get("/api/project-metric-snapshots/dashboard-summary/")

    assert response.status_code == 200
    assert response.data["summary_source"] == "precomputed"
    assert response.data["summary_snapshot_date"] == snapshot_date.isoformat()
    assert response.data["total_projects"] == 9
    assert response.data["alert_summary"]["delayed_milestones"] == 7


def test_current_user_exposes_capabilities(db):
    client = APIClient()
    user, _ = create_user("capabilities@example.com", "PROGRAM_DIRECTOR")
    client.force_authenticate(user=user)

    response = client.get("/api/auth/me/")

    assert response.status_code == 200
    assert "dashboard.view" in response.data["capabilities"]
    assert "analytics.view_executive" in response.data["capabilities"]
    assert "projects.manage" in response.data["capabilities"]


def test_project_lifecycle_events_are_recorded_and_exposed(db):
    client = APIClient()
    manager, agency = create_user("lifecycle@example.com", "M_E_OFFICER")
    project = create_project(agency=agency, created_by=manager, code="PRJ-L1", title="Lifecycle Project")
    ProjectAssignment.objects.create(project=project, user=manager, assignment_role="M_E_OFFICER")

    client.force_authenticate(user=manager)
    response = client.post(
        f"/api/projects/{project.id}/change_status/",
        {"status": "APPROVED_FOR_FUNDING", "reason": "Funding approved."},
        format="json",
    )

    assert response.status_code == 200
    assert ProjectLifecycleEvent.objects.filter(project=project, stage="FUNDED").exists()

    events_response = client.get(f"/api/projects/{project.id}/lifecycle-events/")
    assert events_response.status_code == 200
    assert events_response.data[0]["stage"] == "FUNDED"


def test_evidence_submission_logs_integrity_flags_for_suspicious_capture_metadata(db):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    user, agency = create_user("suspicious@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-I1", title="Integrity Project")
    milestone = ProjectMilestone.objects.create(
        project=project,
        name="Milestone 1",
        sequence_order=1,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        due_date=date.today() + timedelta(days=60),
    )
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FIELD_OFFICER")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/evidence-submissions/",
        {
            "project_id": project.id,
            "milestone_id": milestone.id,
            "source_type": "FIELD_OFFICER",
            "latitude": 7.25,
            "longitude": 5.22,
            "device_id": "device-alpha",
            "accuracy_meters": 150,
            "captured_at": (timezone.now() - timedelta(days=45)).isoformat(),
            "files": [SimpleUploadedFile("evidence.jpg", b"fake-image-content", content_type="image/jpeg")],
        },
        format="multipart",
    )

    assert response.status_code == 201
    submission_id = response.data["id"]
    assert IntegrityCheckLog.objects.filter(evidence_file__evidence_submission_id=submission_id, result="FLAGGED").exists()
    assert SuspiciousActivityLog.objects.filter(submission_id=submission_id, activity_type="LOW_GPS_ACCURACY").exists()


def test_executive_portfolio_breakdown_and_trends_require_analytics_roles(db):
    executive_client = APIClient()
    regular_client = APIClient()

    director, agency = create_user("breakdown@example.com", "PROGRAM_DIRECTOR")
    field_user, _ = create_user("breakdown-field@example.com", "FIELD_OFFICER")
    create_project(agency=agency, created_by=director, code="PRJ-B1", title="Breakdown Project", status="ACTIVE")

    today = timezone.now().date()
    PortfolioMetricSnapshot.objects.create(snapshot_date=today - timedelta(days=1), scope_type="GLOBAL", total_projects=4)
    PortfolioMetricSnapshot.objects.create(snapshot_date=today, scope_type="GLOBAL", total_projects=5)
    PortfolioMetricSnapshot.objects.create(snapshot_date=today, scope_type="STATE", state="Ondo", total_projects=3)

    regular_client.force_authenticate(user=field_user)
    forbidden_response = regular_client.get("/api/project-metric-snapshots/portfolio-breakdown/")
    assert forbidden_response.status_code == 403

    executive_client.force_authenticate(user=director)
    breakdown_response = executive_client.get("/api/project-metric-snapshots/portfolio-breakdown/")
    trends_response = executive_client.get("/api/project-metric-snapshots/portfolio-trends/?days=7")

    assert breakdown_response.status_code == 200
    assert breakdown_response.data[0]["state"] == "Ondo"
    assert trends_response.status_code == 200
    assert len(trends_response.data) == 2


def test_project_creation_rejects_invalid_dates(db):
    client = APIClient()
    manager, agency = create_user("project-validate@example.com", "M_E_OFFICER")
    contractor, _ = Contractor.objects.get_or_create(
        registration_number="RC-INVALID",
        defaults={"name": "Invalid Contractor"},
    )
    client.force_authenticate(user=manager)

    response = client.post(
        "/api/projects/",
        {
            "project_code": "PRJ-INV-1",
            "title": "Invalid Project",
            "description": "",
            "agency": agency.id,
            "contractor": contractor.id,
            "supervising_department": "Dept",
            "category": "BUILDING",
            "sector": "HEALTH",
            "state": "Ondo",
            "lga": "Akure North",
            "ward": "",
            "site_address": "Site Address",
            "latitude": 7.25,
            "longitude": 5.22,
            "geo_fence_radius_meters": 50,
            "budget_amount": "1000.00",
            "currency": "NGN",
            "funding_cycle": "2026",
            "start_date": (date.today() + timedelta(days=180)).isoformat(),
            "expected_end_date": (date.today() - timedelta(days=90)).isoformat(),
            "actual_end_date": None,
            "current_status": "NOT_STARTED",
            "risk_status": "LOW",
            "requires_independent_validation": True,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "expected_end_date" in response.data


def test_evidence_submission_rolls_back_if_file_processing_fails(db):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client = APIClient()
    user, agency = create_user("evidence-atomic@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-E2", title="Atomic Evidence Project")
    milestone = ProjectMilestone.objects.create(
        project=project,
        name="Milestone 1",
        sequence_order=1,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        due_date=date.today() + timedelta(days=60),
    )
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FIELD_OFFICER")
    client.force_authenticate(user=user)
    client.raise_request_exception = False

    with patch("apps.evidence.views.EvidenceSubmissionService.add_file", side_effect=RuntimeError("hash failed")):
        response = client.post(
            "/api/evidence-submissions/",
            {
                "project_id": project.id,
                "milestone_id": milestone.id,
                "source_type": "FIELD_OFFICER",
                "latitude": 7.25,
                "longitude": 5.22,
                "files": [SimpleUploadedFile("evidence.jpg", b"fake-image-content", content_type="image/jpeg")],
            },
            format="multipart",
        )

    assert response.status_code == 500
    assert project.evidence_submissions.count() == 0


def test_project_status_change_creates_single_audit_event(db):
    client = APIClient()
    manager, agency = create_user("status-audit@example.com", "M_E_OFFICER")
    project = create_project(agency=agency, created_by=manager, code="PRJ-AUD-1", title="Audit Project")
    ProjectAssignment.objects.create(project=project, user=manager, assignment_role="M_E_OFFICER")
    client.force_authenticate(user=manager)

    response = client.post(
        f"/api/projects/{project.id}/change_status/",
        {"status": "APPROVED_FOR_FUNDING", "reason": "Approved once."},
        format="json",
    )

    assert response.status_code == 200
    assert AuditEvent.objects.filter(event_type="PROJECT_STATUS_CHANGED", object_id=str(project.id)).count() == 1


def test_disbursement_rejects_duplicate_execution_and_payment_reference(db):
    client = APIClient()
    finance_user, agency = create_user("finance-guard@example.com", "FINANCE_OFFICER")
    manager, _ = create_user("finance-owner@example.com", "M_E_OFFICER")
    project = create_project(
        agency=agency,
        created_by=manager,
        code="PRJ-F1",
        title="Finance Project",
        status="ACTIVE",
    )
    ProjectAssignment.objects.create(project=project, user=finance_user, assignment_role="FINANCE_OFFICER")
    tranche = FundingTranche.objects.create(
        project=project,
        tranche_number=1,
        tranche_name="Tranche 1",
        planned_amount="500.00",
        current_status="ELIGIBLE",
    )
    client.force_authenticate(user=finance_user)

    with patch("apps.finance.services.FinanceService.evaluate_tranche", return_value={"eligible": True}):
        first_response = client.post(
            f"/api/tranches/{tranche.id}/disburse/",
            {"payment_reference": "PAY-001"},
            format="json",
        )
        second_response = client.post(
            f"/api/tranches/{tranche.id}/disburse/",
            {"payment_reference": "PAY-001"},
            format="json",
        )

    assert first_response.status_code == 201
    assert second_response.status_code == 400
    assert "already" in str(second_response.data["detail"]).lower()


def test_finance_officer_can_evaluate_eligible_tranche(db):
    client = APIClient()
    finance_user, agency = create_user("finance-evaluate@example.com", "FINANCE_OFFICER")
    manager, _ = create_user("finance-evaluate-owner@example.com", "M_E_OFFICER")
    project = create_project(
        agency=agency,
        created_by=manager,
        code="PRJ-F2",
        title="Finance Evaluate Project",
        status="ACTIVE",
    )
    ProjectAssignment.objects.create(project=project, user=finance_user, assignment_role="FINANCE_OFFICER")
    tranche = FundingTranche.objects.create(
        project=project,
        tranche_number=1,
        tranche_name="Tranche Eval",
        planned_amount="400.00",
        current_status="LOCKED",
    )
    client.force_authenticate(user=finance_user)

    with patch("apps.finance.services.FinanceService.evaluate_tranche", return_value={"eligible": True, "reason": "Ready"}):
        response = client.post(f"/api/tranches/{tranche.id}/evaluate/")

    assert response.status_code == 200
    assert response.data["eligible"] is True


def test_me_officer_cannot_create_agency_directory_record(db):
    client = APIClient()
    user, _ = create_user("directory-block@example.com", "M_E_OFFICER")
    client.force_authenticate(user=user)

    response = client.post(
        "/api/agencies/",
        {"name": "Blocked Agency", "code": "AG-BLOCK", "type": "Ministry", "is_active": True},
        format="json",
    )

    assert response.status_code == 403


def test_project_manager_can_dispatch_reporting_reminder_for_compliance_queue(db):
    client = APIClient()
    manager, agency = create_user("compliance-reminder@example.com", "M_E_OFFICER")
    project = create_project(
        agency=agency,
        created_by=manager,
        code="PRJ-CR1",
        title="Compliance Reminder Project",
        status="ACTIVE",
    )
    project.reporting_frequency = "MONTHLY"
    project.start_date = timezone.now().date() - timedelta(days=45)
    project.save(update_fields=["reporting_frequency", "start_date"])
    ProjectAssignment.objects.create(project=project, user=manager, assignment_role="M_E_OFFICER")
    client.force_authenticate(user=manager)

    response = client.post(f"/api/projects/{project.id}/dispatch-reporting-reminder/")

    assert response.status_code == 200
    assert response.data["notifications_created"] >= 1
    assert Notification.objects.filter(title__icontains=project.project_code).exists()
