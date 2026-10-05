import json

from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict

from apps.audits.models import AuditEvent


class AuditService:
    @staticmethod
    def normalize_json(value):
        return json.loads(json.dumps(value or {}, cls=DjangoJSONEncoder))

    @staticmethod
    def snapshot_model(instance, *, fields=None, exclude=None):
        if instance is None:
            return {}
        return AuditService.normalize_json(model_to_dict(instance, fields=fields, exclude=exclude))

    @staticmethod
    def log_event(
        *,
        event_type,
        actor=None,
        project=None,
        milestone=None,
        tranche=None,
        action,
        object_type,
        object_id,
        before_state=None,
        after_state=None,
        metadata=None,
        request=None,
    ):
        actor_role = ""
        if actor:
            actor_role = ", ".join(sorted(actor.roles.values_list("code", flat=True)))

        AuditEvent.objects.create(
            event_type=event_type,
            actor_user=actor,
            actor_role=actor_role,
            project=project,
            milestone=milestone,
            tranche=tranche,
            object_type=object_type,
            object_id=object_id,
            action=action,
            before_state_json=AuditService.normalize_json(before_state),
            after_state_json=AuditService.normalize_json(after_state),
            metadata_json=AuditService.normalize_json(metadata),
            ip_address=(request.META.get("REMOTE_ADDR") if request else None),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
        )
