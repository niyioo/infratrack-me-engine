from datetime import date, timedelta
"""
Tests covering QA approval flow, tranche eligibility engine, and disbursement blocking.
"""

from decimal import Decimal

import pytest

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User, UserRole
from apps.common.constants import MilestoneStatus, SubmissionStatus, TrancheStatus
from apps.evidence.models import EvidenceFile, EvidenceSubmission
from apps.evidence.services import EvidenceSubmissionService
from apps.finance.models import Disbursement, FundingTranche
from apps.finance.rules import TrancheEligibilityEngine
from apps.milestones.models import MilestoneChecklistItem, ProjectMilestone
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment
from apps.projects.services import ProjectService
from apps.qa.models import FraudFlag, QAReview


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def make_user(email, role_code):
    user = User.objects.create_user(
        email=email, password="Password123!", first_name="Test", last_name="User"
    )
    role, _ = Role.objects.get_or_create(code=role_code, defaults={"name": role_code.title()})
    agency, _ = Agency.objects.get_or_create(
        code=f"AG-{role_code}", defaults={"name": role_code, "type": "Ministry"}
    )
    UserRole.objects.get_or_create(user=user, role=role, agency=agency)
    return user, agency


def make_project(*, agency, created_by, code="PRJ-QF-01"):
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
        sector="HEALTH",
        state="Ondo",
        lga="Akure North",
        site_address="Test Site",
        site_location=Point(5.22, 7.25, srid=4326),
        geo_fence_radius_meters=5000,
        budget_amount=Decimal("1000000.00"),
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        created_by=created_by,
    )


def make_milestone(project, sequence_order, *, status=MilestoneStatus.SUBMITTED):
    return ProjectMilestone.objects.create(
        project=project,
        name=f"Milestone {sequence_order}",
        sequence_order=sequence_order,
        expected_evidence_type="PHOTO",
        required_evidence_count=1,
        qa_required=True,
        requires_field_validation=False,
        due_date=date.today() + timedelta(days=60),
        current_status=status,
    )


def make_submission(project, milestone, user, *, status=SubmissionStatus.SUBMITTED):
    submission = EvidenceSubmission.objects.create(
        project=project,
        milestone=milestone,
        submitted_by_user=user,
        submitted_by_actor_type="FIELD_OFFICER",
        source_type="FIELD_OFFICER",
        submission_status=status,
        geo_validation_status="PASSED",
        capture_mode="LIVE_IN_APP",
    )
    EvidenceFile.objects.create(
        evidence_submission=submission,
        file=SimpleUploadedFile("ev.jpg", b"x", content_type="image/jpeg"),
        file_type="PHOTO",
        original_filename="ev.jpg",
        mime_type="image/jpeg",
        file_size_bytes=1,
        sha256_hash="abc123",
        captured_at=timezone.now(),
        latitude=7.25,
        longitude=5.22,
        is_primary=True,
    )
    return submission


def make_tranche(project, number, *, milestone=None, amount=Decimal("250000.00")):
    tranche = FundingTranche.objects.create(
        project=project,
        tranche_number=number,
        tranche_name=f"Tranche {number}",
        planned_amount=amount,
        percentage_of_budget=25,
    )
    if milestone:
        milestone.linked_tranche = tranche
        milestone.save(update_fields=["linked_tranche"])
    return tranche


# ---------------------------------------------------------------------------
# QA tests
# ---------------------------------------------------------------------------

def test_qa_officer_can_approve_submitted_evidence(db):
    field_user, agency = make_user("field-qa@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user("qa-officer@example.com", "QA_OFFICER")

    project = make_project(agency=agency, created_by=field_user, code="PRJ-QA01")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

    client = APIClient()
    client.force_authenticate(user=qa_user)

    response = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "APPROVED", "comments": "Looks good."},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["decision"] == "APPROVED"

    milestone.refresh_from_db()
    submission.refresh_from_db()
    project.refresh_from_db()

    assert milestone.current_status == MilestoneStatus.APPROVED
    assert submission.submission_status == SubmissionStatus.APPROVED
    assert project.current_status == "COMPLETED"


def test_qa_officer_can_flag_submission_and_creates_fraud_flag(db):
    field_user, agency = make_user("field-flag@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user("qa-flagger@example.com", "QA_OFFICER")

    project = make_project(agency=agency, created_by=field_user, code="PRJ-QA02")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)

    response = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "FLAGGED", "comments": "Suspected duplicate."},
        format="json",
    )

    assert response.status_code == 201

    fraud_flag = FraudFlag.objects.get(evidence_submission=submission)
    assert fraud_flag.flag_type == "QA_FLAGGED_SUBMISSION"
    assert fraud_flag.severity == "HIGH"

    project.refresh_from_db()
    assert project.current_status == "FLAGGED"


def test_qa_review_rework_required_sets_milestone_status(db):
    field_user, agency = make_user("field-rework@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user("qa-rework@example.com", "QA_OFFICER")

    project = make_project(agency=agency, created_by=field_user, code="PRJ-QA03")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)

    response = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "REWORK_REQUIRED", "comments": "Needs retake."},
        format="json",
    )

    assert response.status_code == 201

    milestone.refresh_from_db()
    submission.refresh_from_db()
    assert milestone.current_status == MilestoneStatus.REWORK_REQUIRED
    assert submission.submission_status == SubmissionStatus.REWORK_REQUIRED


def test_field_officer_cannot_create_qa_review(db):
    field_user, agency = make_user("field-noreview@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-QA04")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=field_user)

    response = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "APPROVED", "comments": "Self-approving."},
        format="json",
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Tranche eligibility + disbursement tests
# ---------------------------------------------------------------------------

def test_tranche_evaluates_as_ineligible_when_milestone_not_approved(db):
    user, agency = make_user("finance-eval@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN01")
    milestone = make_milestone(project, 1, status=MilestoneStatus.SUBMITTED)
    tranche = make_tranche(project, 1, milestone=milestone)

    result = TrancheEligibilityEngine.evaluate(tranche)

    assert result["eligible"] is False
    assert any("milestone" in rule.lower() for rule in result["rules_failed"])


def test_tranche_evaluates_as_eligible_when_all_rules_pass(db):
    user, agency = make_user("finance-elig@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN02")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)

    submission = make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)

    result = TrancheEligibilityEngine.evaluate(tranche)

    assert result["eligible"] is True
    assert result["rules_failed"] == []
    assert "snapshot_hash" in result


def test_finance_officer_can_evaluate_tranche_via_api(db):
    user, agency = make_user("finance-api@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN03")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)
    make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FINANCE_OFFICER")

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(f"/api/tranches/{tranche.id}/evaluate/")

    assert response.status_code == 200
    assert "eligible" in response.data
    assert "rules_passed" in response.data
    assert "rules_failed" in response.data
    assert "snapshot_hash" in response.data


def test_disburse_blocked_when_tranche_ineligible(db):
    user, agency = make_user("finance-block@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN04")
    milestone = make_milestone(project, 1, status=MilestoneStatus.PENDING)
    tranche = make_tranche(project, 1, milestone=milestone)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FINANCE_OFFICER")

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/tranches/{tranche.id}/disburse/",
        {"payment_reference": "REF-BLOCKED-001"},
        format="json",
    )

    assert response.status_code == 400
    assert not Disbursement.objects.filter(tranche=tranche).exists()


def test_disburse_succeeds_when_tranche_eligible(db):
    user, agency = make_user("finance-disburse@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN05")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)
    make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FINANCE_OFFICER")

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/tranches/{tranche.id}/disburse/",
        {"payment_reference": "REF-OK-001"},
        format="json",
    )

    assert response.status_code == 201
    disbursement = Disbursement.objects.get(tranche=tranche)
    assert disbursement.payment_reference == "REF-OK-001"
    assert disbursement.amount == Decimal("250000.00")

    tranche.refresh_from_db()
    assert tranche.current_status == TrancheStatus.DISBURSED


def test_duplicate_payment_reference_is_rejected(db):
    user, agency = make_user("finance-dup@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN06")
    milestone1 = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    milestone2 = make_milestone(project, 2, status=MilestoneStatus.APPROVED)
    tranche1 = make_tranche(project, 1, milestone=milestone1, amount=Decimal("200000.00"))
    tranche2 = make_tranche(project, 2, milestone=milestone2, amount=Decimal("200000.00"))

    # Disburse tranche 1 first (required by previous_tranche rule for tranche 2)
    make_submission(project, milestone1, user, status=SubmissionStatus.APPROVED)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FINANCE_OFFICER")

    client = APIClient()
    client.force_authenticate(user=user)

    client.post(
        f"/api/tranches/{tranche1.id}/disburse/",
        {"payment_reference": "REF-UNIQUE-001"},
        format="json",
    )

    make_submission(project, milestone2, user, status=SubmissionStatus.APPROVED)

    response = client.post(
        f"/api/tranches/{tranche2.id}/disburse/",
        {"payment_reference": "REF-UNIQUE-001"},
        format="json",
    )

    assert response.status_code == 400
    assert Disbursement.objects.filter(tranche=tranche2).count() == 0


def test_field_officer_cannot_disburse_tranche(db):
    field_user, agency = make_user("field-disburse@example.com", "FIELD_OFFICER")
    finance_user, _ = make_user("finance-owner@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=finance_user, code="PRJ-FIN07")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)
    make_submission(project, milestone, finance_user, status=SubmissionStatus.APPROVED)
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

    client = APIClient()
    client.force_authenticate(user=field_user)

    response = client.post(
        f"/api/tranches/{tranche.id}/disburse/",
        {"payment_reference": "REF-DENIED"},
        format="json",
    )

    assert response.status_code == 403


def test_fraud_flag_makes_tranche_ineligible(db):
    user, agency = make_user("finance-fraud@example.com", "FINANCE_OFFICER")
    qa_user, _ = make_user("qa-fraud@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-FIN08")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)
    make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)

    # Create an open fraud flag directly
    FraudFlag.objects.create(
        project=project,
        milestone=milestone,
        flagged_by=qa_user,
        flag_type="QA_FLAGGED_SUBMISSION",
        severity="HIGH",
        description="Suspected fraud.",
        status="OPEN",
    )

    result = TrancheEligibilityEngine.evaluate(tranche)

    assert result["eligible"] is False
    assert any("fraud" in rule.lower() for rule in result["rules_failed"])


# ---------------------------------------------------------------------------
# Loophole regression tests
# ---------------------------------------------------------------------------

def test_submitter_cannot_patch_or_delete_evidence(db):
    field_user, agency = make_user("field-patch@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-LH01")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

    client = APIClient()
    client.force_authenticate(user=field_user)

    patch = client.patch(
        f"/api/evidence-submissions/{submission.id}/", {"submission_status": "APPROVED"}, format="json"
    )
    delete = client.delete(f"/api/evidence-submissions/{submission.id}/")

    assert patch.status_code == 405
    assert delete.status_code == 405
    submission.refresh_from_db()
    assert submission.submission_status == SubmissionStatus.SUBMITTED


def test_contractor_cannot_claim_field_officer_source_type(db):
    contractor_user, agency = make_user("contractor-src@example.com", "CONTRACTOR")
    project = make_project(agency=agency, created_by=contractor_user, code="PRJ-LH02")
    milestone = make_milestone(project, 1, status=MilestoneStatus.OPEN_FOR_SUBMISSION)
    ProjectAssignment.objects.create(project=project, user=contractor_user, assignment_role="CONTRACTOR")

    client = APIClient()
    client.force_authenticate(user=contractor_user)
    response = client.post(
        "/api/evidence-submissions/",
        {
            "project_id": project.id,
            "milestone_id": milestone.id,
            "source_type": "FIELD_OFFICER",
            "latitude": 7.25,
            "longitude": 5.22,
            "files": [SimpleUploadedFile("evidence.jpg", b"img", content_type="image/jpeg")],
        },
        format="multipart",
    )

    assert response.status_code == 403
    assert not EvidenceSubmission.objects.filter(project=project).exists()


def test_non_image_evidence_upload_is_rejected(db):
    field_user, agency = make_user("field-upload@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-LH03")
    milestone = make_milestone(project, 1, status=MilestoneStatus.OPEN_FOR_SUBMISSION)
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

    client = APIClient()
    client.force_authenticate(user=field_user)
    response = client.post(
        "/api/evidence-submissions/",
        {
            "project_id": project.id,
            "milestone_id": milestone.id,
            "source_type": "FIELD_OFFICER",
            "latitude": 7.25,
            "longitude": 5.22,
            "files": [SimpleUploadedFile("payload.html", b"<script></script>", content_type="text/html")],
        },
        format="multipart",
    )

    assert response.status_code == 400


def test_qa_officer_cannot_review_own_submission(db):
    qa_user, agency = make_user("qa-self@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=qa_user, code="PRJ-LH04")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, qa_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)
    response = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "APPROVED"},
        format="json",
    )

    assert response.status_code == 400
    assert not QAReview.objects.filter(evidence_submission=submission).exists()


def test_qa_review_rejects_invalid_decision_and_double_review(db):
    field_user, agency = make_user("field-double@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user("qa-double@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-LH05")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)

    invalid = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "WHATEVER"},
        format="json",
    )
    first = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "APPROVED"},
        format="json",
    )
    second = client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "REJECTED", "comments": "Changed my mind."},
        format="json",
    )

    assert invalid.status_code == 400
    assert first.status_code == 201
    assert second.status_code == 400
    assert QAReview.objects.filter(evidence_submission=submission).count() == 1


def test_qa_cannot_approve_when_required_checklist_item_fails(db):
    field_user, agency = make_user("field-check@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user("qa-check@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-LH06")
    milestone = make_milestone(project, 1)
    item = MilestoneChecklistItem.objects.create(
        project_milestone=milestone, title="Roof installed", max_score=10, is_required=True
    )
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)
    response = client.post(
        "/api/qa-reviews/",
        {
            "evidence_submission_id": submission.id,
            "decision": "APPROVED",
            "item_scores": [{"checklist_item_id": item.id, "score_awarded": 3}],
        },
        format="json",
    )

    assert response.status_code == 400
    milestone.refresh_from_db()
    assert milestone.current_status != MilestoneStatus.APPROVED


def test_finance_officer_cannot_patch_tranche_status_or_exceed_budget(db):
    user, agency = make_user("finance-patch@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-LH07")
    tranche = make_tranche(project, 1)

    client = APIClient()
    client.force_authenticate(user=user)

    status_patch = client.patch(f"/api/tranches/{tranche.id}/", {"current_status": "DISBURSED"}, format="json")
    tranche.refresh_from_db()
    assert status_patch.status_code == 200
    assert tranche.current_status == TrancheStatus.LOCKED

    amount_patch = client.patch(f"/api/tranches/{tranche.id}/", {"planned_amount": "5000000.00"}, format="json")
    assert amount_patch.status_code == 400


def test_later_tranche_blocked_when_any_earlier_tranche_undisbursed(db):
    user, agency = make_user("finance-gap@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-LH08")
    make_tranche(project, 1, amount=Decimal("100000.00"))
    milestone = make_milestone(project, 3, status=MilestoneStatus.APPROVED)
    tranche3 = make_tranche(project, 3, milestone=milestone, amount=Decimal("100000.00"))
    make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)

    result = TrancheEligibilityEngine.evaluate(tranche3)

    assert result["eligible"] is False
    assert "Previous tranche not disbursed." in result["rules_failed"]


def test_integrity_flagged_evidence_blocks_tranche(db):
    user, agency = make_user("finance-integrity@example.com", "FINANCE_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-LH09")
    milestone = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=milestone)
    submission = make_submission(project, milestone, user, status=SubmissionStatus.APPROVED)
    submission.integrity_status = "FLAGGED"
    submission.save(update_fields=["integrity_status"])

    result = TrancheEligibilityEngine.evaluate(tranche)

    assert result["eligible"] is False


# ---------------------------------------------------------------------------
# Fraud flag resolution
# ---------------------------------------------------------------------------

def _flag_via_qa(code):
    field_user, agency = make_user(f"field-{code}@example.com", "FIELD_OFFICER")
    flagger, _ = make_user(f"qa-flagger-{code}@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code=code)
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)
    client = APIClient()
    client.force_authenticate(user=flagger)
    client.post(
        "/api/qa-reviews/",
        {"evidence_submission_id": submission.id, "decision": "FLAGGED", "comments": "Photo reused."},
        format="json",
    )
    return project, milestone, FraudFlag.objects.get(evidence_submission=submission), flagger, field_user


def test_second_reviewer_can_dismiss_fraud_flag_and_unblock_project(db):
    project, milestone, flag, _, _ = _flag_via_qa("PRJ-FF01")
    resolver, _ = make_user("qa-resolver@example.com", "QA_OFFICER")
    tranche = make_tranche(project, 1, milestone=milestone)

    client = APIClient()
    client.force_authenticate(user=resolver)
    response = client.post(
        f"/api/fraud-flags/{flag.id}/resolve/",
        {"resolution": "DISMISSED", "note": "Original photo verified on site."},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["status"] == "DISMISSED"
    milestone.refresh_from_db()
    project.refresh_from_db()
    assert milestone.current_status == MilestoneStatus.REWORK_REQUIRED
    assert project.current_status != "FLAGGED"
    result = TrancheEligibilityEngine.evaluate(tranche)
    assert "Project has unresolved fraud flags." not in result["rules_failed"]


def test_flagger_cannot_resolve_own_fraud_flag(db):
    _, _, flag, flagger, _ = _flag_via_qa("PRJ-FF02")
    client = APIClient()
    client.force_authenticate(user=flagger)

    response = client.post(
        f"/api/fraud-flags/{flag.id}/resolve/", {"resolution": "DISMISSED", "note": "Never mind."}, format="json"
    )

    assert response.status_code == 400
    flag.refresh_from_db()
    assert flag.status == "OPEN"


def test_fraud_flag_resolution_requires_permission_and_note(db):
    _, _, flag, _, field_user = _flag_via_qa("PRJ-FF03")
    resolver, _ = make_user("qa-resolver3@example.com", "QA_OFFICER")

    field_client = APIClient()
    field_client.force_authenticate(user=field_user)
    forbidden = field_client.post(
        f"/api/fraud-flags/{flag.id}/resolve/", {"resolution": "DISMISSED", "note": "Mine is fine."}, format="json"
    )

    qa_client = APIClient()
    qa_client.force_authenticate(user=resolver)
    no_note = qa_client.post(f"/api/fraud-flags/{flag.id}/resolve/", {"resolution": "RESOLVED"}, format="json")

    assert forbidden.status_code == 403
    assert no_note.status_code == 400
    flag.refresh_from_db()
    assert flag.status == "OPEN"


# ---------------------------------------------------------------------------
# Milestone progression on evidence submission
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "start_status",
    [MilestoneStatus.PENDING, MilestoneStatus.OPEN_FOR_SUBMISSION, MilestoneStatus.REWORK_REQUIRED],
)
def test_accepted_evidence_puts_milestone_in_front_of_qa(db, start_status):
    field_user, agency = make_user(f"field-adv-{start_status.lower()}@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code=f"PRJ-ADV-{start_status[:4]}")
    milestone = make_milestone(project, 1, status=start_status)
    submission = make_submission(project, milestone, field_user, status=SubmissionStatus.DRAFT)

    EvidenceSubmissionService.submit(submission, 7.25, 5.22, {})

    milestone.refresh_from_db()
    assert milestone.current_status == MilestoneStatus.SUBMITTED


def test_milestone_api_reports_counted_evidence(db):
    field_user, agency = make_user("field-count@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-CNT-01")
    ProjectAssignment.objects.create(project=project, user=field_user, assignment_role="FIELD_OFFICER")
    milestone = make_milestone(project, 1)
    make_submission(project, milestone, field_user)
    make_submission(project, milestone, field_user, status=SubmissionStatus.APPROVED)
    # Blocked (off-site) and rework submissions don't satisfy the requirement.
    make_submission(project, milestone, field_user, status=SubmissionStatus.BLOCKED)
    make_submission(project, milestone, field_user, status=SubmissionStatus.REWORK_REQUIRED)

    client = APIClient()
    client.force_authenticate(user=field_user)
    response = client.get("/api/milestones/", {"project": project.id})

    assert response.status_code == 200
    rows = response.data["results"] if isinstance(response.data, dict) else response.data
    assert [row["submitted_evidence_count"] for row in rows] == [2]


# ---------------------------------------------------------------------------
# Checklist pass mark and status after disbursement
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("score, approved", [(7, True), (6, False), (0, False)])
def test_required_checklist_item_passes_at_the_milestone_pass_mark(db, score, approved):
    field_user, agency = make_user(f"field-mark-{score}@example.com", "FIELD_OFFICER")
    qa_user, _ = make_user(f"qa-mark-{score}@example.com", "QA_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code=f"PRJ-MARK-{score}")
    milestone = make_milestone(project, 1)
    ProjectMilestone.objects.filter(pk=milestone.pk).update(required_checklist_score=70)
    item = MilestoneChecklistItem.objects.create(
        project_milestone=milestone, title="Footing complete", max_score=10, is_required=True
    )
    submission = make_submission(project, milestone, field_user)

    client = APIClient()
    client.force_authenticate(user=qa_user)
    response = client.post(
        "/api/qa-reviews/",
        {
            "evidence_submission_id": submission.id,
            "decision": "APPROVED",
            "item_scores": [{"checklist_item_id": item.id, "score_awarded": score}],
            "comments": "Checked on site.",
        },
        format="json",
    )

    assert (response.status_code == 201) is approved
    milestone.refresh_from_db()
    assert (milestone.current_status == MilestoneStatus.APPROVED) is approved
    if not approved:
        assert "70% pass mark" in str(response.data)


def test_disbursement_keeps_the_project_delivery_status(db):
    user, agency = make_user("finance-status@example.com", "FINANCE_OFFICER")
    field_user, _ = make_user("field-status@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=user, code="PRJ-STAT-01")
    approved = make_milestone(project, 1, status=MilestoneStatus.APPROVED)
    make_milestone(project, 2, status=MilestoneStatus.OPEN_FOR_SUBMISSION)
    make_submission(project, approved, field_user, status=SubmissionStatus.APPROVED)
    tranche = make_tranche(project, 1, milestone=approved)
    ProjectAssignment.objects.create(project=project, user=user, assignment_role="FINANCE_OFFICER")
    ProjectService.sync_operational_status(project)
    project.refresh_from_db()
    assert project.current_status == "ACTIVE"

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(f"/api/tranches/{tranche.id}/disburse/", {"payment_reference": "REF-STAT-1"}, format="json")

    assert response.status_code == 201
    project.refresh_from_db()
    assert project.current_status == "ACTIVE"
    assert project.financial_disbursement_percent > 0


def test_evidence_files_get_unguessable_names(db):
    field_user, agency = make_user("field-names@example.com", "FIELD_OFFICER")
    project = make_project(agency=agency, created_by=field_user, code="PRJ-NAME-01")
    milestone = make_milestone(project, 1)
    submission = make_submission(project, milestone, field_user)

    stored = submission.files.get().file.name

    assert stored.startswith(f"evidence/project_{project.id}/")
    assert "ev.jpg" not in stored and f"milestone_{milestone.id}" not in stored
    assert stored.endswith(".jpg") and len(stored.rsplit("/", 1)[1]) == 32 + 4
