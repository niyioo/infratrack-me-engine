from django.contrib import admin
from apps.evidence.models import (
    EvidenceSubmission,
    EvidenceFile,
    CaptureAttempt,
    GeoFenceExceptionRequest,
)

admin.site.register(EvidenceSubmission)
admin.site.register(EvidenceFile)
admin.site.register(CaptureAttempt)
admin.site.register(GeoFenceExceptionRequest)