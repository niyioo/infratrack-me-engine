from datetime import date, timedelta

from django.contrib.gis.geos import Point

from apps.accounts.models import Role, User, UserRole
from apps.common.constants import MilestoneStatus, ProjectStatus, QAReviewDecision, SubmissionStatus
from apps.evidence.models import EvidenceSubmission
from apps.milestones.models import MilestoneChecklistItem, ProjectMilestone
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project
from apps.projects.services import ProjectService
from apps.qa.services import QAService


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


def create_project(*, agency, created_by, code):
    contractor, _ = Contractor.objects.get_or_create(
        registration_number=f"RC-{code}",
        defaults={"name": f"Contractor {code}"},
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
        site_address="Site Address",
        site_location=Point(5.22, 7.25, srid=4326),
        geo_fence_radius_meters=50,
        budget_amount=1000,
        start_date=date.today() - timedelta(days=90),
        expected_end_date=date.today() + timedelta(days=180),
        created_by=created_by,
    )


def create_submission(*, project, milestone, user, status=SubmissionStatus.SUBMITTED):
    return EvidenceSubmission.objects.create(
        project=project,
        milestone=milestone,
        submitted_by_user=user,
        submitted_by_actor_type="FIELD_OFFICER",
        source_type="FIELD_OFFICER",
        submission_status=status,
        geo_validation_status="PASSED",
    )


def test_project_status_sync_moves_project_to_active_when_work_starts(db):
    user, agency = create_user("officer@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-L1")
    milestone = ProjectMilestone.objects.create(
        project=project,
        name="Milestone 1",
        sequence_order=1,
        due_date=date.today() + timedelta(days=10),
        current_status=MilestoneStatus.SUBMITTED,
    )
    create_submission(project=project, milestone=milestone, user=user)

    ProjectService.sync_operational_status(project, user=user)
    project.refresh_from_db()

    assert project.current_status == ProjectStatus.ACTIVE


def test_project_status_sync_marks_project_completed_and_sets_actual_end_date(db):
    user, agency = create_user("officer2@example.com", "FIELD_OFFICER")
    project = create_project(agency=agency, created_by=user, code="PRJ-L2")
    ProjectMilestone.objects.create(
        project=project,
        name="Milestone 1",
        sequence_order=1,
        due_date=date.today() - timedelta(days=1),
        completed_date=date.today(),
        current_status=MilestoneStatus.APPROVED,
    )

    ProjectService.sync_operational_status(project, user=user)
    project.refresh_from_db()

    assert project.current_status == ProjectStatus.COMPLETED
    assert project.actual_end_date == date.today()


def test_qa_review_clears_completed_date_when_rework_is_requested(db):
    submitter, agency = create_user("submitter@example.com", "FIELD_OFFICER")
    reviewer, _ = create_user("reviewer@example.com", "QA_OFFICER")
    project = create_project(agency=agency, created_by=submitter, code="PRJ-L3")
    milestone = ProjectMilestone.objects.create(
        project=project,
        name="Milestone 1",
        sequence_order=1,
        due_date=date.today() + timedelta(days=5),
        completed_date=date.today(),
        current_status=MilestoneStatus.APPROVED,
    )
    checklist_item = MilestoneChecklistItem.objects.create(
        project_milestone=milestone,
        title="Photo clarity",
        max_score=10,
        is_required=True,
    )
    submission = create_submission(project=project, milestone=milestone, user=submitter, status=SubmissionStatus.SUBMITTED)

    QAService.review_submission(
        reviewer=reviewer,
        submission=submission,
        decision=QAReviewDecision.REWORK_REQUIRED,
        comments="Need a clearer submission.",
        item_scores=[
            {"checklist_item_id": checklist_item.id, "score_awarded": 2, "comment": "Blurred image."}
        ],
    )

    milestone.refresh_from_db()
    submission.refresh_from_db()
    project.refresh_from_db()

    assert milestone.current_status == MilestoneStatus.REWORK_REQUIRED
    assert milestone.completed_date is None
    assert submission.submission_status == SubmissionStatus.REWORK_REQUIRED
    assert project.current_status == ProjectStatus.ACTIVE
