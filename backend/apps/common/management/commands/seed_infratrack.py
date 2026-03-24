from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from apps.accounts.models import Role, User, UserRole
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment
from apps.milestones.models import ProjectMilestone, MilestoneChecklistItem
from apps.finance.models import FundingTranche


class Command(BaseCommand):
    help = "Seed InfraTrack development data"

    def handle(self, *args, **options):
        role_codes = [
            ("SUPER_ADMIN", "Super Admin"),
            ("PROGRAM_DIRECTOR", "Program Director"),
            ("M_E_OFFICER", "M&E Officer"),
            ("FIELD_OFFICER", "Field Officer"),
            ("CONTRACTOR", "Contractor"),
            ("QA_OFFICER", "QA Officer"),
            ("FINANCE_OFFICER", "Finance Officer"),
            ("AUDITOR", "Auditor"),
        ]
        roles = {}
        for code, name in role_codes:
            roles[code], _ = Role.objects.get_or_create(code=code, defaults={"name": name})

        agency, _ = Agency.objects.get_or_create(
            code="FMW-OND",
            defaults={"name": "Federal Monitoring Works - Ondo", "type": "Ministry"}
        )
        contractor, _ = Contractor.objects.get_or_create(
            registration_number="RC-123456",
            defaults={"name": "PrimeBuild Nigeria Ltd"}
        )

        admin_user, _ = User.objects.get_or_create(
            email="admin@infratrack.local",
            defaults={"first_name": "System", "last_name": "Admin", "is_staff": True, "is_superuser": True}
        )
        admin_user.set_password("Password123!")
        admin_user.save()

        qa_user, _ = User.objects.get_or_create(
            email="qa@infratrack.local",
            defaults={"first_name": "QA", "last_name": "Officer"}
        )
        qa_user.set_password("Password123!")
        qa_user.save()

        finance_user, _ = User.objects.get_or_create(
            email="finance@infratrack.local",
            defaults={"first_name": "Finance", "last_name": "Officer"}
        )
        finance_user.set_password("Password123!")
        finance_user.save()

        field_user, _ = User.objects.get_or_create(
            email="field@infratrack.local",
            defaults={"first_name": "Field", "last_name": "Officer"}
        )
        field_user.set_password("Password123!")
        field_user.save()

        for user, role_code in [
            (admin_user, "SUPER_ADMIN"),
            (qa_user, "QA_OFFICER"),
            (finance_user, "FINANCE_OFFICER"),
            (field_user, "FIELD_OFFICER"),
        ]:
            UserRole.objects.get_or_create(user=user, role=roles[role_code], agency=agency)

        project, _ = Project.objects.get_or_create(
            project_code="INF-OND-0001",
            defaults={
                "title": "Construction of Primary Health Centre Block",
                "description": "New PHC building in Akure North",
                "agency": agency,
                "contractor": contractor,
                "supervising_department": "Infrastructure Delivery Unit",
                "category": "BUILDING",
                "sector": "HEALTH",
                "state": "Ondo",
                "lga": "Akure North",
                "site_address": "Oke Aro, Akure North, Ondo State",
                "site_location": Point(5.2200, 7.2500, srid=4326),
                "geo_fence_radius_meters": 50,
                "budget_amount": 120000000.00,
                "start_date": "2026-03-01",
                "expected_end_date": "2026-09-30",
                "created_by": admin_user,
            }
        )

        ProjectAssignment.objects.get_or_create(project=project, user=qa_user, assignment_role="QA_OFFICER")
        ProjectAssignment.objects.get_or_create(project=project, user=finance_user, assignment_role="FINANCE_OFFICER")
        ProjectAssignment.objects.get_or_create(project=project, user=field_user, assignment_role="FIELD_OFFICER")

        tranche1, _ = FundingTranche.objects.get_or_create(
            project=project,
            tranche_number=1,
            defaults={"tranche_name": "Foundation Tranche", "planned_amount": 30000000, "percentage_of_budget": 25}
        )

        milestone1, _ = ProjectMilestone.objects.get_or_create(
            project=project,
            sequence_order=1,
            defaults={
                "name": "Foundation Complete",
                "description": "Foundation casting and curing completed",
                "expected_evidence_type": "PHOTO",
                "required_evidence_count": 3,
                "required_video_count": 0,
                "qa_required": True,
                "requires_field_validation": True,
                "required_checklist_score": 70,
                "due_date": "2026-04-15",
                "linked_tranche": tranche1,
            }
        )

        MilestoneChecklistItem.objects.get_or_create(
            project_milestone=milestone1,
            title="Concrete foundation visibly complete",
            defaults={"max_score": 10, "sort_order": 1}
        )
        MilestoneChecklistItem.objects.get_or_create(
            project_milestone=milestone1,
            title="Reinforcement and footing quality acceptable",
            defaults={"max_score": 10, "sort_order": 2}
        )

        self.stdout.write(self.style.SUCCESS("InfraTrack seed data created successfully."))