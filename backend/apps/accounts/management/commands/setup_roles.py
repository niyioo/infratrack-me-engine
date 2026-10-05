from django.core.management.base import BaseCommand

from apps.accounts.roles import ensure_system_roles


class Command(BaseCommand):
    help = "Create ProveTrack's system roles. Safe to run repeatedly; creates no users or demo data."

    def handle(self, *args, **options):
        roles = ensure_system_roles()
        self.stdout.write(self.style.SUCCESS(f"{len(roles)} system roles present."))
