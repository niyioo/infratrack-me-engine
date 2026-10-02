from celery import shared_task

from apps.analytics.services import AnalyticsService
from apps.notifications.services import NotificationService
from apps.projects.models import Project


@shared_task
def dispatch_project_alerts_task(project_id):
    project = Project.objects.select_related("agency", "contractor").get(id=project_id)
    alerts = AnalyticsService.build_project_alerts(project)
    if not alerts:
        return {"notifications_created": 0, "alerts": []}

    notifications = NotificationService.notify_project_alerts(project, alerts)
    return {
        "notifications_created": len(notifications),
        "alerts": alerts,
    }
