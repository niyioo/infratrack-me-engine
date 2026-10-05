from django.core.management.base import BaseCommand

from apps.analytics.services import AnalyticsService
from apps.projects.models import Project


class Command(BaseCommand):
    help = "Refresh project-level and portfolio-level analytics snapshots."

    def handle(self, *args, **options):
        project_count = 0
        for project in Project.objects.select_related("agency", "contractor").all():
            AnalyticsService.calculate_project_snapshot(project)
            project_count += 1

        portfolio_snapshots = AnalyticsService.refresh_portfolio_snapshots()

        self.stdout.write(
            self.style.SUCCESS(
                f"Refreshed {project_count} project snapshots and {len(portfolio_snapshots)} portfolio snapshots."
            )
        )
