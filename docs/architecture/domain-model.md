# Domain Model

## Core Entities

- `User`, `Role`, and `UserRole` define identity and authorization context.
- `Agency` and `Contractor` represent delivery and oversight organizations.
- `Project` is the top-level monitored asset and owns assignments, milestones, tranches, submissions, audits, and analytics.

## Workflow Entities

- `ProjectMilestone` defines the ordered execution and verification checkpoints for a project.
- `MilestoneChecklistItem` defines the scoring rubric used during QA review.
- `EvidenceSubmission` and `EvidenceFile` store field evidence and file metadata.
- `QAReview` and `QAReviewItem` capture the QA decision and checklist scoring outcome.
- `FraudFlag` records suspicious or escalated review outcomes.

## Financial Entities

- `FundingTranche` represents a release of funds tied to milestone state.
- `TrancheEligibilitySnapshot` stores the evaluated finance rules for a tranche at a point in time.
- `Disbursement` records an executed release.
- `ManualOverrideRequest` and `ManualOverrideApproval` are defined for exceptional finance workflows.

## Oversight Entities

- `AuditEvent` stores before/after state changes and actor metadata.
- `IntegrityCheckLog` stores file integrity checks.
- `SuspiciousActivityLog` stores suspicious platform behavior and workflow anomalies.
- `ProjectMetricSnapshot` stores derived analytics for dashboarding and portfolio views.
