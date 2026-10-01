# System Overview

BuildWitness is a three-client system built around a single Django REST API.

- `backend/` contains the Django + DRF application, GeoDjango models, JWT auth, and business workflows for projects, milestones, evidence, QA, finance, audits, analytics, and notifications.
- `frontend/` is the React/Vite web dashboard for administrators, QA reviewers, finance teams, and oversight users.
- `mobile/` is the Expo/React Native field app for project selection, evidence capture, geofence checks, and offline-first submission flows.

The core operational flow is:

1. Projects and milestones are created in the backend.
2. Assigned field users capture evidence for a project milestone.
3. The backend validates evidence, hashes files, and checks the project geofence.
4. QA reviewers approve, reject, request rework, or flag submissions.
5. Finance evaluates tranche eligibility based on approved milestone and evidence state.
6. Audit and analytics data are recorded for reporting and oversight.
