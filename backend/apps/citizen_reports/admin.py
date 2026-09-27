from django.contrib import admin

from apps.citizen_reports.models import CitizenReport


@admin.register(CitizenReport)
class CitizenReportAdmin(admin.ModelAdmin):
    list_display = ("tracking_code", "project", "category", "status", "created_at")
    list_filter = ("status", "category")
    search_fields = ("tracking_code", "description", "project__title", "project__project_code")
    exclude = ("reporter_fingerprint",)
    readonly_fields = ("tracking_code", "project", "category", "description", "photo", "created_at")
