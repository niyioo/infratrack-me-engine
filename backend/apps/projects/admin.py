from django import forms
from django.contrib import admin
from django.contrib.gis.geos import Point

from apps.projects.models import Project, ProjectAssignment, ProjectStatusHistory, ProjectLifecycleEvent


class ProjectAdminForm(forms.ModelForm):
    latitude = forms.FloatField(min_value=-90, max_value=90, required=True)
    longitude = forms.FloatField(min_value=-180, max_value=180, required=True)

    class Meta:
        model = Project
        exclude = ("site_location",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.site_location:
            self.fields["latitude"].initial = self.instance.site_location.y
            self.fields["longitude"].initial = self.instance.site_location.x

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.site_location = Point(
            self.cleaned_data["longitude"],
            self.cleaned_data["latitude"],
            srid=4326,
        )
        if commit:
            instance.save()
            self.save_m2m()
        return instance


class ProjectAssignmentInline(admin.TabularInline):
    model = ProjectAssignment
    extra = 1
    autocomplete_fields = ("user", "assigned_by")


class ProjectStatusHistoryInline(admin.TabularInline):
    model = ProjectStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_status", "to_status", "changed_by", "reason", "created_at")


class ProjectLifecycleEventInline(admin.TabularInline):
    model = ProjectLifecycleEvent
    extra = 0
    can_delete = False
    readonly_fields = ("stage", "event_type", "source_status", "note", "metadata_json", "created_by", "created_at")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    form = ProjectAdminForm
    inlines = [ProjectAssignmentInline, ProjectStatusHistoryInline, ProjectLifecycleEventInline]
    list_display = ("project_code", "title", "agency", "contractor", "state", "lga", "current_status", "risk_status", "created_by")
    list_filter = ("current_status", "risk_status", "state", "agency", "contractor", "requires_independent_validation")
    search_fields = ("project_code", "title", "site_address", "state", "lga", "ward")
    autocomplete_fields = ("agency", "contractor", "created_by")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Identity", {"fields": ("project_code", "title", "description", "created_by")}),
        ("Ownership", {"fields": ("agency", "contractor", "supervising_department", "category", "sector")}),
        ("Location", {"fields": ("state", "lga", "ward", "site_address", "latitude", "longitude", "geo_fence_radius_meters")}),
        ("Funding & Dates", {"fields": ("budget_amount", "currency", "funding_cycle", "start_date", "expected_end_date", "actual_end_date")}),
        ("Controls", {"fields": ("current_status", "risk_status", "requires_independent_validation")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("agency", "contractor", "created_by")

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProjectAssignment)
class ProjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "assignment_role", "is_active", "assigned_at", "assigned_by")
    list_filter = ("assignment_role", "is_active")
    search_fields = ("project__project_code", "project__title", "user__email", "user__first_name", "user__last_name")
    autocomplete_fields = ("project", "user", "assigned_by")


@admin.register(ProjectStatusHistory)
class ProjectStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("project", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("from_status", "to_status")
    search_fields = ("project__project_code", "project__title", "reason")
    autocomplete_fields = ("project", "changed_by")
