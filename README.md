# InfraTrack M&E Engine

A project monitoring, evaluation, and disbursement control platform that ties financial releases to geo-verified physical milestones.

> **No verified milestone → No QA approval → No disbursement**

---

## What It Does

InfraTrack replaces contractor self-reporting with a rules-driven digital workflow. Funds stay locked until field evidence is captured, geo-verified, and QA-approved.

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
python manage.py seed_infratrack
python manage.py runserver 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm install
# Configure frontend/.env with VITE_API_BASE_URL
npm run dev
```

### Mobile
```bash
cd mobile
npm install
# Configure mobile/.env with EXPO_PUBLIC_API_BASE_URL (use LAN IP for physical devices)
npx expo start -c
```

---

## Default Seed Credentials

| Role | Email |
|---|---|
| Admin | `admin@infratrack.local` |
| Field Officer | `field@infratrack.local` |
| QA Reviewer | `qa@infratrack.local` |
| Finance | `finance@infratrack.local` |

**Password:** `Password123!`

---

## Project Structure

```
infratrack-me-engine/
├── backend/    # Django API
├── frontend/   # React web dashboard
└── mobile/     # Expo field app
```

---

## Notes

- Requires **GeoDjango + PostGIS**. On Windows, install GDAL/GEOS/PROJ via OSGeo4W and set paths in `.env`.
- For mobile on a physical device, use your machine's **LAN IP**, not `127.0.0.1`.
- Never commit real secrets or production credentials.

---

**Author:** Adeniyi Olateru-Olagbegi — BravEdge Solutions
