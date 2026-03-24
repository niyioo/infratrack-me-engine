from celery import shared_task


@shared_task
def send_notification_task(notification_id):
    return f"Notification {notification_id} queued"