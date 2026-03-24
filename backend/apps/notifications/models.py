from django.db import models


class Notification(models.Model):
    recipient = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    channel = models.CharField(max_length=50, default="IN_APP")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)