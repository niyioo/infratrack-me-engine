from django.contrib import admin
from apps.audits.models import AuditEvent, IntegrityCheckLog, SuspiciousActivityLog

admin.site.register(AuditEvent)
admin.site.register(IntegrityCheckLog)
admin.site.register(SuspiciousActivityLog)