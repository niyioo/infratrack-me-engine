from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "recipient", "title", "message", "channel", "is_read", "created_at"]
        read_only_fields = ["recipient", "title", "message", "channel", "created_at"]
