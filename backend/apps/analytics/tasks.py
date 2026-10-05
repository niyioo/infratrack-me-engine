from celery import shared_task

from apps.analytics.services import AnalyticsService
from apps.projects.models import Project


@shared_task
def generate_project_snapshot_task(project_id):
    project = Project.objects.select_related("agency", "contractor").get(id=project_id)
    snapshot = AnalyticsService.calculate_project_snapshot(project)
    return snapshot.id


@shared_task
def refresh_all_project_snapshots_task():
    snapshot_ids = []
    for project in Project.objects.select_related("agency", "contractor").all():
        snapshot = AnalyticsService.calculate_project_snapshot(project)
        snapshot_ids.append(snapshot.id)
    return snapshot_ids


@shared_task
def refresh_portfolio_snapshots_task():
    snapshots = AnalyticsService.refresh_portfolio_snapshots()
    return [snapshot.id for snapshot in snapshots]
