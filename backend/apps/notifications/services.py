from apps.notifications.models import Notification
from apps.accounts.models import User
from apps.common.permissions import HIGH_PRIVILEGE_ROLE_CODES
from apps.analytics.services import AnalyticsService


class NotificationService:
    @staticmethod
    def create_notification(recipient, title, message, channel="IN_APP"):
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            channel=channel,
        )

    @staticmethod
    def create_notifications(recipients, *, title, message, channel="IN_APP"):
        notifications = []
        seen_ids = set()
        for recipient in recipients:
            if not recipient or recipient.id in seen_ids:
                continue
            seen_ids.add(recipient.id)
            notifications.append(
                Notification(
                    recipient=recipient,
                    title=title,
                    message=message,
                    channel=channel,
                )
            )
        return Notification.objects.bulk_create(notifications)

    @staticmethod
    def project_alert_recipients(project):
        assigned_users = User.objects.filter(assignments__project=project, assignments__is_active=True)
        governance_users = User.objects.filter(
            user_roles__role__code__in=HIGH_PRIVILEGE_ROLE_CODES
        )
        return list((assigned_users | governance_users).distinct())

    @staticmethod
    def notify_project_alerts(project, alerts):
        recipients = NotificationService.project_alert_recipients(project)
        created_notifications = []
        for alert in alerts:
            created_notifications.extend(
                NotificationService.create_notifications(
                    recipients,
                    title=f"{alert['severity']} alert for {project.project_code}",
                    message=alert["message"],
                )
            )
        return created_notifications

    @staticmethod
    def notify_reporting_compliance(project):
        compliance = AnalyticsService.reporting_compliance(project)
        if not compliance:
            return []

        reason = compliance["attention_reason"].replace("_", " ").title()
        due_date = compliance["reporting_due_date"]
        recipients = NotificationService.project_alert_recipients(project)
        return NotificationService.create_notifications(
            recipients,
            title=f"Reporting reminder for {project.project_code}",
            message=(
                f"{reason}: {project.title} is due on {due_date} under the "
                f"{project.reporting_frequency.lower()} reporting cycle."
            ),
        )
