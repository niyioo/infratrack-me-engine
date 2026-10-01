# BuildWitness M&E Engine

[![CI](https://github.com/niyioo/infratrack-me-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/niyioo/infratrack-me-engine/actions/workflows/ci.yml)

A project monitoring, evaluation, and disbursement control platform that ties financial releases to geo-verified physical milestones.

> **No verified milestone → No QA approval → No disbursement**

---

## What It Does

BuildWitness replaces contractor self-reporting with a rules-driven digital workflow. Funds stay locked until field evidence is captured, geo-verified, and QA-approved.

Built for ministries, donor-funded programs, public works teams, and institutional oversight units.

---

## Key Features

- **Project Registry** — Register projects, contractors, budgets, timelines, and milestones
- **Milestone Engine** — Sequenced milestones with evidence requirements and dependency rules
- **Field Evidence Capture** — Live in-app capture with GPS, geo-fence validation, and offline queuing
- **QA Review** — Approve, reject, or flag evidence with full audit history
- **Funding Gate Logic** — Deterministic tranche unlock based on milestone, evidence, and QA state
- **Analytics** — Physical vs financial progress, burn variance, delay detection, risk scoring

---

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Django, DRF, PostgreSQL/PostGIS, Celery, Redis |
| Frontend | React, Vite, TypeScript, TanStack Query, Tailwind CSS |
| Mobile | Expo, React Native, TypeScript |

---

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# Configure backend/.env (see README details)
python manage.py migrate
python manage.py seed_buildwitness
python manage.py runserver 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm install
# Configure frontend/.env with VITE_API_BASE_URL
npm run dev
```

### Local Infra
```bash
docker compose up -d db redis
```

### Background Jobs
```bash
cd backend
.venv\Scripts\python.exe -m celery -A config worker -l info
.venv\Scripts\python.exe -m celery -A config beat -l info
```

### Windows One-Command Startup
```powershell
.\scripts\start-local-stack.ps1
```
This launches:
- Django API
- Celery worker
- Celery beat
- Frontend Vite dev server

### Mobile
```bash
cd mobile
npm install
# Configure mobile/.env with EXPO_PUBLIC_API_BASE_URL (use LAN IP for physical devices)
npx expo start -c
```

### Citizen Portal
A separate public site where anyone can anonymously report on an ongoing project.
It talks only to the unauthenticated `/api/public/` endpoints and shares no code with the staff dashboard.
```bash
cd citizen-portal
npm install
# Configure citizen-portal/.env with VITE_PUBLIC_API_BASE_URL (see .env.example)
npm run dev   # http://localhost:5174
```
Reports land in the staff dashboard under **Citizen Reports** for triage. When enough *distinct*
anonymous reporters raise concerns about a project, its risk is raised automatically (never a
payment block). Only a staff escalation creates a fraud flag, which blocks tranche release.
Set `NUM_PROXIES` correctly in production, or every citizen will appear to share one IP.

---

## Default Seed Credentials

| Role | Email |
|---|---|
| Admin | `admin@buildwitness.local` |
| Field Officer | `field@buildwitness.local` |
| QA Reviewer | `qa@buildwitness.local` |
| Finance | `finance@buildwitness.local` |

**Password:** `Password123!`

---

## Project Structure

```
infratrack-me-engine/
├── backend/    # Django API
├── frontend/        # React web dashboard (staff)
├── citizen-portal/  # Public anonymous citizen reporting site
└── mobile/          # Expo field app
```

---

## Testing

CI (`.github/workflows/ci.yml`) runs on every pull request: backend tests against PostGIS,
a migrations-vs-models check, type-checks for `frontend/`, `mobile/` and `citizen-portal/`,
and a production build of the citizen portal image.

To run the backend tests locally, the suite expects a provisioned PostGIS test database
(`tests/conftest.py` reuses it rather than creating one):

```bash
docker compose up -d db
docker compose exec db psql -U infra -d infratrack -c "CREATE DATABASE infratrack_test;"
docker compose exec db psql -U infra -d infratrack_test -c "CREATE EXTENSION postgis;"
```

Then run `pytest` with `DJANGO_SETTINGS_MODULE=config.settings.test` and `DB_HOST` pointing at that database.

---

## Deployment

**Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).** It takes a fresh server to a
running pilot with one Compose file ([`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml)):
automatic HTTPS via Caddy for the dashboard, API and citizen portal, backups,
the reporter-anonymity checklist, and building the Android app.

Production settings (`config.settings.prod`) refuse to start without `SECRET_KEY`,
`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (both the dashboard
and portal origins) and `NUM_PROXIES`. The runbook explains each one.

---

## Notes

- Requires **GeoDjango + PostGIS**. On Windows, install GDAL/GEOS/PROJ via OSGeo4W and set paths in `.env`.
- Scheduled analytics refresh depends on **Redis + Celery worker + Celery beat** being up.
- The analytics cache can be manually refreshed with `python manage.py refresh_analytics_snapshots`.
- For mobile on a physical device, use your machine's **LAN IP**, not `127.0.0.1`.
- Never commit real secrets or production credentials.

---

**Author:** Adeniyi Olateru-Olagbegi — BravEdge Solutions
