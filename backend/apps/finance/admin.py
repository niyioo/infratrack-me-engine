from django.contrib import admin
from apps.finance.models import (
    FundingTranche,
    TrancheEligibilitySnapshot,
    Disbursement,
    ManualOverrideRequest,
    ManualOverrideApproval,
)

admin.site.register(FundingTranche)
admin.site.register(TrancheEligibilitySnapshot)
admin.site.register(Disbursement)
admin.site.register(ManualOverrideRequest)
admin.site.register(ManualOverrideApproval)