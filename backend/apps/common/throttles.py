from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class EvidenceUploadThrottle(UserRateThrottle):
    scope = "evidence_upload"


class FinanceActionThrottle(UserRateThrottle):
    scope = "finance_action"


class OverrideRequestThrottle(UserRateThrottle):
    scope = "override_request"


class CitizenReportThrottle(AnonRateThrottle):
    scope = "citizen_report"


class CitizenLookupThrottle(CitizenReportThrottle):
    scope = "citizen_lookup"


class ReportExportThrottle(UserRateThrottle):
    scope = "report_export"
