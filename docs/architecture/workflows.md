# Workflows

## Authentication

- Web and mobile clients authenticate with JWT tokens.
- After login, clients fetch `/api/auth/me/` to hydrate the current user profile.
- Protected screens depend on the presence of both a valid token and a resolved user profile.

## Evidence Submission

1. A user opens capture from a project context.
2. The client uses the project coordinates and geofence radius to guide capture.
3. The submission is posted with `project_id`, `milestone_id`, coordinates, and files.
4. The backend validates that the milestone belongs to the project and that the user is allowed to submit evidence.
5. The backend performs geo-validation and persists a blocked or submitted workflow state.

## QA Review

1. A QA officer loads visible evidence submissions.
2. A review records checklist scores and a final decision.
3. The backend updates submission and milestone status together.
4. Flagged reviews create fraud flags for downstream finance and oversight checks.

## Tranche Disbursement

1. Finance evaluates a tranche against milestone approval, approved evidence, prior tranche status, and open fraud flags.
2. Eligible tranches can be disbursed by authorized finance users.
3. Disbursement updates tranche state, project state, and audit logs.
