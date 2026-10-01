import hashlib
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from apps.accounts.models import Role, User, UserRole
from apps.organizations.models import Agency, Contractor
from apps.projects.models import Project, ProjectAssignment
from apps.milestones.models import ProjectMilestone, MilestoneChecklistItem
from apps.finance.models import FundingTranche
from apps.citizen_reports.models import CitizenReport, CitizenReportCategory
from apps.common.constants import MilestoneStatus
from apps.projects.services import ProjectService
from apps.qa.models import FraudFlag


class Command(BaseCommand):
    help = "Seed InfraTrack development data"

    def handle(self, *args, **options):
        today = timezone.localdate()
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
                # Relative to the seeding date so demo data is always an ongoing project.
                "start_date": today - timedelta(days=30),
                "expected_end_date": today + timedelta(days=270),
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
                "due_date": today + timedelta(days=45),
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

        self._seed_portfolio(today=today, agency=agency, contractor=contractor, admin_user=admin_user,
                             assignees=[qa_user, finance_user])

        # Store health/progress on every project so list views and the map have it.
        for seeded in Project.objects.all():
            ProjectService.sync_operational_status(seeded, user=admin_user, reason="Seed data.")

        self.stdout.write(self.style.SUCCESS("InfraTrack seed data created successfully."))

    def _seed_portfolio(self, *, today, agency, contractor, admin_user, assignees):
        """A spread of projects in different states, so the map and exports have content."""
        portfolio = [
            # code, title, state, lga, site, (lng, lat), category, sector, budget,
            # start offset, end offset (days from today), milestone status, milestone due offset
            ("INF-LAG-0002", "Rehabilitation of Ikorodu Road Drainage", "Lagos", "Kosofe",
             "Ketu, Ikorodu Road, Lagos", (3.3872, 6.5795), "ROAD", "TRANSPORT", 340000000,
             -120, 150, MilestoneStatus.OPEN_FOR_SUBMISSION, 20),
            ("INF-FCT-0003", "Kuje Primary School Classroom Block", "FCT", "Kuje",
             "LEA Primary School, Kuje", (7.2276, 8.8792), "BUILDING", "EDUCATION", 85000000,
             -300, -20, MilestoneStatus.APPROVED, -40),
            ("INF-KAN-0004", "Solar Borehole Water Scheme", "Kano", "Ungogo",
             "Rijiyar Zaki, Ungogo, Kano", (8.4833, 12.0833), "WATER", "WATER_SANITATION", 42000000,
             -200, -15, MilestoneStatus.OPEN_FOR_SUBMISSION, -30),
            ("INF-RIV-0005", "Rumuokoro Health Post Renovation", "Rivers", "Obio/Akpor",
             "Rumuokoro Junction, Port Harcourt", (7.0000, 4.8667), "BUILDING", "HEALTH", 64000000,
             -90, 120, MilestoneStatus.SUBMITTED, 10),
            ("INF-OYO-0006", "Ogbomoso–Iseyin Rural Access Road", "Oyo", "Ogbomoso North",
             "Ogbomoso–Iseyin Road, km 4", (4.2500, 8.1333), "ROAD", "TRANSPORT", 510000000,
             15, 400, MilestoneStatus.PENDING, 90),
        ]
        for (code, title, state, lga, site, (lng, lat), category, sector, budget,
             start_offset, end_offset, milestone_status, due_offset) in portfolio:
            project, created = Project.objects.get_or_create(
                project_code=code,
                defaults={
                    "title": title,
                    "agency": agency,
                    "contractor": contractor,
                    "category": category,
                    "sector": sector,
                    "state": state,
                    "lga": lga,
                    "site_address": site,
                    "site_location": Point(lng, lat, srid=4326),
                    "geo_fence_radius_meters": 100,
                    "budget_amount": budget,
                    "start_date": today + timedelta(days=start_offset),
                    "expected_end_date": today + timedelta(days=end_offset),
                    "created_by": admin_user,
                },
            )
            for user in assignees:
                ProjectAssignment.objects.get_or_create(project=project, user=user, assignment_role="M_E_OFFICER")
            if not created:
                continue

            FundingTranche.objects.create(
                project=project, tranche_number=1, tranche_name="Mobilisation Tranche",
                planned_amount=budget // 4, percentage_of_budget=25,
            )
            ProjectMilestone.objects.create(
                project=project, sequence_order=1, name="Site works complete",
                expected_evidence_type="PHOTO", required_evidence_count=2, qa_required=True,
                due_date=today + timedelta(days=due_offset), current_status=milestone_status,
            )

        # Open integrity concerns on the Rivers project: a fraud flag and citizen reports.
        flagged = Project.objects.get(project_code="INF-RIV-0005")
        if not flagged.fraud_flags.exists():
            FraudFlag.objects.create(
                project=flagged, flagged_by=admin_user, flag_type="DUPLICATE_EVIDENCE", severity="HIGH",
                description="Evidence photo matches one submitted for another project.",
            )
        if not flagged.citizen_reports.exists():
            for i, (category, text, dlat, dlng) in enumerate([
                (CitizenReportCategory.NO_ACTIVITY, "No workers on site for the past three weeks, gate is locked.", 0.0006, -0.0004),
                (CitizenReportCategory.POOR_QUALITY, "Plaster on the new wall is already cracking and falling off.", -0.0003, 0.0005),
            ]):
                CitizenReport.objects.create(
                    project=flagged, category=category, description=text,
                    latitude=4.8667 + dlat, longitude=7.0000 + dlng,
                    tracking_code=f"SEED{i + 1:04d}",
                    reporter_fingerprint=hashlib.sha256(f"seed-reporter-{i}".encode()).hexdigest(),
                )