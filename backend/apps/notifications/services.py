from apps.notifications.models import Notification


class NotificationService:
    @staticmethod
    def create_notification(recipient, title, message, channel="IN_APP"):
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            channel=channel,
        )