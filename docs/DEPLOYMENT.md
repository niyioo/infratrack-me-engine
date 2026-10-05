# Deploying ProveTrack

This runbook takes a fresh Linux server to a running pilot: the staff dashboard,
the API, the public citizen portal, and an Android build of the mobile app.
Everything except the mobile app runs from one Docker Compose file
([`deploy/docker-compose.prod.yml`](../deploy/docker-compose.prod.yml)).

## What runs where

| Service | What it is | Reached at |
|---|---|---|
| `web` (Caddy) | HTTPS for all three domains, serves the dashboard, static files and uploads, proxies the rest | ports 80/443 |
| `backend` | Django API (gunicorn). Runs migrations, `collectstatic` and `setup_roles` on start | `https://API_DOMAIN` |
| `celery`, `celery-beat` | Background jobs and the hourly analytics/health refresh | — |
| `citizen-portal` | Public reporting site (nginx, strict CSP, no logs) | `https://PORTAL_DOMAIN` |
| `db` | PostgreSQL 16 + PostGIS | internal only |
| `redis` | Celery broker | internal only |
| Mobile app | Android APK for field officers and citizens | installed on phones |

The dashboard is at `https://APP_DOMAIN`. Database and Redis are never exposed
on the host.

## 1. Before you start

- **A server.** Ubuntu 24.04 (any Linux with Docker works). For a pilot:
  2 vCPU, 4 GB RAM, 40 GB disk. Add disk if you expect many evidence photos.
- **Docker Engine with the Compose plugin** (`docker compose version` works).
- **Three DNS records** (A, and AAAA if you use IPv6) pointing at the server,
  for example `app.example.org`, `api.example.org`, `report.example.org`.
- **Ports 80 and 443 open** to the internet. Caddy needs both to get
  certificates from Let's Encrypt.
- **A CARTO basemaps key** for the dashboard map. It's free, takes a minute and
  needs no account: <https://carto.com/basemaps/apikey/> (choose
  *commercial*). In CARTO's dashboard, restrict it to your `APP_DOMAIN`.
  Commercial use is free up to 1 million tile requests a month.

## 2. First deployment

```bash
git clone https://github.com/niyioo/infratrack-me-engine.git
cd infratrack-me-engine
cp deploy/.env.prod.example deploy/.env.prod
```

Edit `deploy/.env.prod` (it holds secrets and is git-ignored):

- Set the three domains and `ACME_EMAIL` (Let's Encrypt expiry notices).
- Generate `SECRET_KEY` and `DB_PASSWORD`:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
- Set `ALLOWED_HOSTS` to the API domain, and `CORS_ALLOWED_ORIGINS` /
  `CSRF_TRUSTED_ORIGINS` to `https://APP_DOMAIN,https://PORTAL_DOMAIN`.
- Leave `NUM_PROXIES=1` (Caddy is the one proxy in front of Django).
- Paste the CARTO key into `VITE_CARTO_BASEMAP_KEY`.

Start everything:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

The first build takes several minutes. When it's up, create the first
administrator. This is a Django superuser, who can then create everyone else
in the dashboard:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
  exec backend python manage.py createsuperuser
```

Do **not** run `seed_provetrack` in production. It creates demo projects and
demo users with a published password. The eight system roles are created
automatically on every start (`setup_roles`).

### Check it works

- `https://APP_DOMAIN` shows the sign-in page, and the superuser can sign in.
- `https://API_DOMAIN/api/docs/` shows the API reference.
- `https://PORTAL_DOMAIN` shows the citizen portal and lists ongoing projects.
- After creating a project, it appears on the dashboard **Map** with CARTO tiles.
  If you see "API key required" across the map, the key is missing or restricted
  to a different domain.

## 3. Configuration reference

Set these in `deploy/.env.prod`. Defaults are fine unless noted.

| Variable | Purpose |
|---|---|
| `APP_DOMAIN`, `API_DOMAIN`, `PORTAL_DOMAIN` | Hostnames Caddy serves and gets certificates for. **Required.** |
| `ACME_EMAIL` | Contact for Let's Encrypt. **Required.** |
| `SECRET_KEY` | Django secret. **Required.** Changing it signs everyone out and resets citizen-report duplicate detection (it keys the anonymous reporter fingerprint). |
| `ALLOWED_HOSTS` | API hostname(s). **Required.** |
| `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | Dashboard and portal origins (with `https://`). **Required.** |
| `NUM_PROXIES` | Reverse proxies in front of Django. **Required**; `1` with this stack. A wrong value breaks rate limits and lets clients spoof their IP. |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database credentials (shared by Postgres and Django). |
| `GUNICORN_WORKERS` | API worker processes (≈ 2 × CPU cores). |
| `VITE_CARTO_BASEMAP_KEY`, `VITE_CARTO_BASEMAP_STYLE` | Map tiles. Style `voyager`, `light_all` or `dark_all`. Baked in at build time, so rebuild `web` after changing. |
| `VITE_MAP_TILE_URL`, `VITE_MAP_TILE_ATTRIBUTION` | Use another tile server instead of CARTO. |
| `JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS` | Session lengths (60 min / 7 days). |
| `CITIZEN_REPORT_WINDOW_DAYS`, `..._HIGH_THRESHOLD`, `..._CRITICAL_THRESHOLD` | How many distinct anonymous reporters within the window raise a project's risk to High / Critical (30 days, 3, 6). |
| `CITIZEN_REPORT_DAILY_LIMIT_PER_PROJECT` | Reports one connection may file about one project per day (3). |
| `THROTTLE_*` | Rate limits, e.g. `THROTTLE_LOGIN=5/min`, `THROTTLE_CITIZEN_REPORT=10/hour`, `THROTTLE_REPORT_EXPORT=60/hour`. |
| `MAP_MAX_CITIZEN_REPORTS` | Newest open citizen reports drawn on the map (1000). |

## 4. Keeping citizen reports anonymous

The citizen portal promises reporters anonymity. These pieces keep that promise,
so check them before launch:

- [ ] **No access logs with IPs.** Caddy writes no access logs (the Caddyfile has
      no `log` directive) and the portal's nginx has `access_log off`. If you add
      a load balancer, CDN or WAF in front, turn off IP logging for `/api/public/`
      there too.
- [ ] **`NUM_PROXIES` matches reality.** Add one for each extra proxy in front of Caddy.
- [ ] **Photos are stripped.** The API re-encodes citizen photos and drops
      EXIF/GPS metadata. Nothing to configure.
- [ ] **No third-party requests from the portal.** Its CSP allows only itself and
      the API, so don't add analytics or fonts from other domains to it.
- [ ] **Stored data.** Reports keep only an HMAC fingerprint of the connection
      (for duplicate detection), never the IP itself.

## 5. Operations

All commands run from the repo root. To save typing:

```bash
alias itc='docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod'
```

**Deploy an update**
```bash
git pull
itc up -d --build
```
Migrations run automatically when `backend` starts.

**Logs:** `itc logs -f backend` (or `celery`, `web`, `citizen-portal`).

**Status:** `itc ps`

**Backups.** Run these daily (cron) and copy the files off the server.
```bash
# Database
itc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > provetrack-$(date +%F).dump
# Uploaded evidence and citizen photos
docker run --rm -v provetrack_media_data:/media -v "$PWD":/backup alpine \
  tar czf /backup/provetrack-media-$(date +%F).tgz -C /media .
```

**Restore**
```bash
itc exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < provetrack-YYYY-MM-DD.dump
docker run --rm -v provetrack_media_data:/media -v "$PWD":/backup alpine \
  sh -c 'cd /media && tar xzf /backup/provetrack-media-YYYY-MM-DD.tgz'
```

**Refresh health scores now** (they also refresh hourly):
`itc exec backend python manage.py refresh_analytics_snapshots`

## 6. Mobile app (Android)

The app talks to one API, fixed when the app is built, so each environment
(staging, production) gets its own build.

### Build an APK on your machine (no account needed)

Needs Node 20, JDK 17+ (Android Studio's bundled JBR is fine) and the Android SDK.

1. **One-time: create the upload (signing) key.** Keep it outside the repo and
   **back it up**: without it you can never ship an update to installed copies.
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore ~/.provetrack/provetrack-upload.jks \
     -alias provetrack-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Then add to `~/.gradle/gradle.properties` (not the repo):
   ```properties
   PROVETRACK_UPLOAD_STORE_FILE=/home/you/.provetrack/provetrack-upload.jks
   PROVETRACK_UPLOAD_STORE_PASSWORD=...
   PROVETRACK_UPLOAD_KEY_ALIAS=provetrack-upload
   PROVETRACK_UPLOAD_KEY_PASSWORD=...
   ```
   Without these, release builds are signed with the shared debug key (fine for
   testing, not for distribution).
2. **Build**, pointing at your API:
   ```bash
   cd mobile
   npm ci
   EXPO_PUBLIC_API_BASE_URL=https://api.example.org/api npm run build:android:apk
   ```
   (On Windows PowerShell, set it first: `$env:EXPO_PUBLIC_API_BASE_URL="https://api.example.org/api"`.)
   The APK is at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

`npm run build:android:apk` regenerates `mobile/android/` from `app.json` each
time (`expo prebuild --clean`). Never edit that folder by hand; release signing
and network settings come from `mobile/plugins/withAndroidRelease.js`. Builds
pointed at an `https://` API only allow HTTPS. Builds pointed at `http://`
(a laptop or test server) allow plain HTTP.

**Version bumps:** before each release, raise `expo.android.versionCode` (an
integer Android uses to tell updates apart) and `expo.version` in
`mobile/app.json`.

### Or build in the cloud with EAS (needs a free Expo account)

`mobile/eas.json` has `preview` (APK) and `production` (Play Store bundle)
profiles. Put your staging and production API URLs in it, then:
```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```
EAS can create and store the signing key for you.

### Getting it onto phones

- **Pilot:** share the APK file directly (email, a shared drive, MDM). Phones
  must allow installing from that source.
- **Wider rollout:** Google Play's *internal testing* track (up to 100 testers,
  no review wait) using an `.aab` from the EAS `production` profile or
  `gradlew bundleRelease`.

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `backend` exits with `ImproperlyConfigured` | A required variable is missing from `.env.prod`. The message names it. |
| Browser shows a certificate error | DNS doesn't point at the server yet, or ports 80/443 are blocked. Check `itc logs web`. |
| Dashboard loads but every request fails | `VITE_API_BASE_URL`/`API_DOMAIN` wrong, or the dashboard origin is missing from `CORS_ALLOWED_ORIGINS`. Rebuild `web` after fixing domains. |
| "API key required" tiles on the map | CARTO key missing, or restricted to another domain. |
| Citizen reports all count as one reporter | `NUM_PROXIES` too low for the proxies actually in front. |
| Mobile app: "Can't reach the ProveTrack server" | The APK was built for a different API URL, or the API isn't reachable over HTTPS from the phone. |
