from django.db import models


class ProjectStatus(models.TextChoices):
    NOT_STARTED = "NOT_STARTED", "Not Started"
    ACTIVE = "ACTIVE", "Active"
    AWAITING_VERIFICATION = "AWAITING_VERIFICATION", "Awaiting Verification"
    APPROVED_FOR_FUNDING = "APPROVED_FOR_FUNDING", "Approved For Funding"
    DELAYED = "DELAYED", "Delayed"
    FLAGGED = "FLAGGED", "Flagged"
    COMPLETED = "COMPLETED", "Completed"
    SUSPENDED = "SUSPENDED", "Suspended"


class RiskStatus(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class ProjectPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class ReportingFrequency(models.TextChoices):
    WEEKLY = "WEEKLY", "Weekly"
    BIWEEKLY = "BIWEEKLY", "Bi-Weekly"
    MONTHLY = "MONTHLY", "Monthly"
    QUARTERLY = "QUARTERLY", "Quarterly"
    AD_HOC = "AD_HOC", "Ad Hoc"


class MilestoneStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    OPEN_FOR_SUBMISSION = "OPEN_FOR_SUBMISSION", "Open For Submission"
    SUBMITTED = "SUBMITTED", "Submitted"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    REWORK_REQUIRED = "REWORK_REQUIRED", "Rework Required"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    FLAGGED = "FLAGGED", "Flagged"


class SubmissionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    BLOCKED = "BLOCKED", "Blocked"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    REWORK_REQUIRED = "REWORK_REQUIRED", "Rework Required"
    FLAGGED = "FLAGGED", "Flagged"


class SourceType(models.TextChoices):
    CONTRACTOR = "CONTRACTOR", "Contractor"
    FIELD_OFFICER = "FIELD_OFFICER", "Field Officer"


class GeoValidationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PASSED = "PASSED", "Passed"
    FAILED = "FAILED", "Failed"
    EXCEPTION_REQUESTED = "EXCEPTION_REQUESTED", "Exception Requested"
    EXCEPTION_APPROVED = "EXCEPTION_APPROVED", "Exception Approved"


class QAReviewDecision(models.TextChoices):
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    REWORK_REQUIRED = "REWORK_REQUIRED", "Rework Required"
    FLAGGED = "FLAGGED", "Flagged"


class TrancheStatus(models.TextChoices):
    LOCKED = "LOCKED", "Locked"
    ELIGIBLE = "ELIGIBLE", "Eligible"
    DISBURSED = "DISBURSED", "Disbursed"
    ON_HOLD = "ON_HOLD", "On Hold"
    OVERRIDE_PENDING = "OVERRIDE_PENDING", "Override Pending"
    OVERRIDE_APPROVED = "OVERRIDE_APPROVED", "Override Approved"
