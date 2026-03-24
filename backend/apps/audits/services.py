from apps.audits.models import AuditEvent


class AuditService:
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
            first_role = actor.roles.first()
            actor_role = first_role.code if first_role else ""

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
            before_state_json=before_state or {},
            after_state_json=after_state or {},
            metadata_json=metadata or {},
            ip_address=(request.META.get("REMOTE_ADDR") if request else None),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
        )