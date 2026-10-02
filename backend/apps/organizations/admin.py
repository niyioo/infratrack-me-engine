from django.contrib import admin

from apps.organizations.models import Agency, Contractor


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "type", "state_scope", "is_active")
    list_filter = ("type", "is_active", "state_scope")
    search_fields = ("code", "name", "state_scope")
    autocomplete_fields = ("parent_agency",)


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ("registration_number", "name", "risk_level", "rating", "is_active")
    list_filter = ("risk_level", "is_active")
    search_fields = ("registration_number", "name", "contact_person", "email", "phone")
