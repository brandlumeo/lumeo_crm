# Production Deployment Guide — Lumeo CRM

This document describes the exact production deployment architecture, deployment triggers, CI/CD pipeline, and operational procedures for **Lumeo CRM** (`https://lumeo.estgrp.in`). It is written for engineering maintenance and automated coding assistants (such as Claude Code or Antigravity) to ensure code changes are validated and deployed reliably without breaking live services.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              Developer Machine               │
                      │  Local Checks (npm build, pytest, migrate)   │
                      └──────────────────────┬───────────────────────┘
                                             │ git push origin main
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             GitHub Repository                │
                      │          brandlumeo/lumeo_crm                │
                      │             (branch: main)                   │
                      └──────────────┬───────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Webhook Event                         │ Webhook Event
                 ▼                                       ▼
  ┌──────────────────────────────┐        ┌──────────────────────────────┐
  │        Vercel (Edge)         │        │       Render (PaaS)          │
  │ Project: lumeo-crm-exjs      │        │ Service: lumeo-crm-backend   │
  │ Root: frontend/              │        │ Root: backend/               │
  │ Framework: Next.js 15 (Node) │        │ Runtime: Python 3.12 (WSGI)  │
  │ URL: https://lumeo.estgrp.in │        │ URL: *.onrender.com          │
  └──────────────┬───────────────┘        └──────────────┬───────────────┘
                 │                                       │
                 │ API Requests (NEXT_PUBLIC_API_URL)    │ PostgreSQL Connections
                 └───────────────────────────────────────┼────────────────────────┐
                                                         │                        │
                                                         ▼                        ▼
                                          ┌──────────────────────────────┐ ┌──────────────┐
                                          │     Supabase PostgreSQL      │ │ Supabase S3  │
                                          │      Managed Database        │ │ File Storage │
                                          │     (Host: *.supabase.co)    │ │  (Receipts & │
                                          │    Pooler: 6543 / Dir: 5432  │ │  Documents)  │
                                          └──────────────────────────────┘ └──────────────┘
```

---

## 1. Deployment Trigger & Exact Execution Sequence

### What Kicks Off a Deploy?
A deployment is triggered **automatically via GitHub webhook integration** whenever commits are pushed to the `main` branch of the GitHub repository (`brandlumeo/lumeo_crm`):
* **Render (Backend):** Detects commit on `main`, clones repository, executes `backend/build.sh`, applies migrations, collects static files, and starts Gunicorn.
* **Vercel (Frontend):** Detects commit on `main`, runs `cd frontend && npm run build`, statically compiles pages, bakes `NEXT_PUBLIC_API_URL`, and promotes the build to production (`lumeo.estgrp.in`).

> **Note on CLIs:** No deployment CLI commands (such as `vercel --prod` or `render deploy`) are executed locally. The deployment pipeline is 100% Git-triggered via GitHub webhooks.

### Exact Sequence to Follow After Making a Change

```bash
# STEP 1: Verify backend models & migrations locally
python backend/manage.py makemigrations
python backend/manage.py migrate

# STEP 2: Run backend regression tests
python -m pytest backend/crm/tests.py
python -m pytest backend/attendance/tests.py

# STEP 3: Verify frontend TypeScript & Next.js production build
npm --prefix frontend run build

# STEP 4: Review changed files & staging
git status
git diff

# STEP 5: Stage modified files
git add <specific-files-or-folders>

# STEP 6: Commit using Conventional Commits
git commit -m "feat(scope): concise description"

# STEP 7: Push to live production branch
git push origin main
```

---

## 2. Git Workflow & Commit Conventions

* **Live Production Remote:** `origin` (`https://github.com/brandlumeo/lumeo_crm.git`)
* **Live Production Branch:** `main`
* **Branching Model:** Direct trunk-based delivery on `main`. All commits pushed to `origin/main` automatically build and deploy to production within minutes.
* **Commit Message Conventions:** Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard strictly:
  * Format: `<type>(<scope>): <lowercase imperative message>`
  * Permitted Types: `feat`, `fix`, `style`, `refactor`, `perf`, `chore`, `test`
  * Established Scopes:
    * `expenses` — Spend management, claim workflows, settlements
    * `quotes` — Quotations, SOW studio, PDF engine
    * `finance` — Inflows, outflows, executive cashflow dashboards
    * `bills` — Accounts payable, vendor records, payment vouchers
    * `attendance` — Shifts, clock-in, geofence, leaves, timesheets
    * `payroll` — Salary logs, payslips, bank disbarment batches
    * `reports` — Daily report matrices, activity audits, leaderboard
    * `build` — Configuration, dependency updates, packaging

### Pre-Push Checklist (Mandatory)
1. **Never push unverified frontend code:** Always run `npm --prefix frontend run build`. Next.js has `ignoreBuildErrors: false` enabled; any TypeScript or bundling error will immediately break the Vercel production deployment.
2. **Never push code without corresponding migrations:** If a Django model in `backend/*/models.py` is modified, run `python backend/manage.py makemigrations` and commit the new migration file inside `backend/<app>/migrations/`.
3. **Never commit secret files:** Ensure `backend/.env`, `frontend/.env.local`, `.venv/`, and `database_backups/` remain ignored.

---

## 3. Backend (Render)

* **Service Name:** `lumeo-crm-backend`
* **Service Type:** Web Service (Native Python environment)
* **Live Hostname:** `https://lumeo-crm-backend.onrender.com`
* **Repository Root Directory:** Repository root (`.`) or `backend/` [UNVERIFIED: Render settings allow either specifying Root Directory = `backend` or running from root with `cd backend`].
* **Build Command:**
  ```bash
  cd backend && bash build.sh
  ```
  *(or `bash build.sh` if Root Directory is set to `backend`)*
* **Start Command:**
  ```bash
  cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```
  *(or `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120` if Root Directory is `backend`)*

### Build Script (`backend/build.sh`)
The file [backend/build.sh](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/backend/build.sh) controls the exact steps executed during each Render deployment:

```bash
#!/usr/bin/env bash
set -e   # Exit immediately on any error

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Applying database migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
```

### Key Backend Behaviors
1. **Automated Migrations:** Database migrations are applied automatically during the build step via `python manage.py migrate --noinput`. Because `set -e` is enforced, if a migration fails, the build halts immediately, and Render does **not** deploy the broken build.
2. **Static Asset Delivery:** Static assets are collected into `backend/staticfiles/` and served through WhiteNoise (`whitenoise.middleware.WhiteNoiseMiddleware` with `CompressedManifestStaticFilesStorage`).
3. **Python Runtime:** Python `3.12` (compatible with `3.11`/`3.12` Render images; Docker builds use `python:3.12-slim`).
4. **Dependencies:** Specified in [backend/requirements.txt](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/backend/requirements.txt).
5. **Background Tasks & Workers:**
   * Celery is integrated in the codebase with Redis support, but in production, `CELERY_TASK_ALWAYS_EAGER=True` is the default setting in `backend/config/settings.py`.
   * This ensures transactional tasks (such as sending emails or notifications) execute synchronously and reliably **without requiring a separate, paid Celery worker service on Render**.
   * Recurring cron routines are invoked via HTTP endpoints authenticated with `CRON_SECRET_KEY` (`TriggerCronTasksView`).

---

## 4. Frontend (Vercel)

* **Project Name:** `lumeo-crm-exjs`
* **Framework Preset:** Next.js
* **Live Custom Domain:** `https://lumeo.estgrp.in`
* **Vercel Default Alias:** `https://lumeo-crm-exjs.vercel.app`
* **Repository Root Directory:** `frontend/` (configured in Vercel project settings or root [vercel.json](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/vercel.json))
* **Build Command:**
  ```bash
  npm run build
  ```
  *(or `cd frontend && npm run build` if invoked from root)*
* **Output Directory:** `.next` (or `frontend/.next` if root-scoped)
* **Configuration Files:**
  * Root [vercel.json](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/vercel.json):
    ```json
    {
      "framework": "nextjs",
      "buildCommand": "cd frontend && npm run build",
      "outputDirectory": "frontend/.next"
    }
    ```
  * Frontend [frontend/vercel.json](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/frontend/vercel.json):
    ```json
    {
      "framework": "nextjs",
      "outputDirectory": ".next"
    }
    ```

### How the Frontend Connects to the Backend
The frontend discovers the Django REST API via the single client environment variable:
```env
NEXT_PUBLIC_API_URL=https://lumeo-crm-backend.onrender.com/api/v1
```
* **Critical Requirement:** `NEXT_PUBLIC_*` variables are baked into static JavaScript client bundles during compilation (`next build`). This variable **must** be set in Vercel Project Settings (`Environment Variables -> Production`) prior to triggering builds.
* If `NEXT_PUBLIC_API_URL` is omitted, `frontend/src/lib/api.ts` will throw a runtime error during production builds:
  `[Lumeo] NEXT_PUBLIC_API_URL is not set. Set it to your backend API URL before building for production.`

### Production vs. Preview Deployments
* **Production Deployment:** Pushes to the `main` branch build and immediately deploy to `https://lumeo.estgrp.in`.
* **Preview Deployments:** Pull requests and development branches generate isolated preview URLs (e.g., `https://lumeo-crm-exjs-*.vercel.app`). The backend's `CORS_ALLOWED_ORIGIN_REGEXES` explicitly allows `r"^https://.*\.vercel\.app$"` so preview deployments can authenticate with the Render API.

---

## 5. Database & Storage (Supabase)

### Database Connection
The backend connects to a managed PostgreSQL database hosted on **Supabase** (`ap-south-1` / Mumbai or equivalent region):
* The backend does **not** parse a single `DATABASE_URL` string in `settings.py`; instead, it expects **discrete environment variables**:
  * `DB_NAME`: Database name (e.g. `postgres`)
  * `DB_USER`: PostgreSQL username (e.g. `postgres` or `postgres.<project-ref>`)
  * `DB_PASSWORD`: PostgreSQL user password
  * `DB_HOST`: Hostname (e.g. `aws-0-ap-south-1.pooler.supabase.com` or `db.jmaclvnwiaycikaphxzs.supabase.co`)
  * `DB_PORT`: `6543` (Transaction Pooler / PgBouncer) or `5432` (Direct Connection)
* **Connection Pooling:** In production, using the Supabase **Connection Pooler (port 6543)** is strongly advised to prevent PostgreSQL connection exhaustion when Gunicorn scales workers.
* **Persistent Connections:** `settings.py` sets `'CONN_MAX_AGE': 60` and `'CONN_HEALTH_CHECKS': True` for efficient connection reuse.

### Schema Migrations & Direct Database Access Policy
* **Rule:** **Never modify the database schema directly inside the Supabase SQL Editor or Table Editor.**
* All schema modifications must be authored as Django migrations in Git and committed.
* Django manages the internal `django_migrations` table; out-of-band schema changes in Supabase will cause future migration failures and desynchronizations.

### Media & Document Storage (Supabase Storage S3)
User uploads (expense receipts, quotes, client invoices, avatars, and contracts) are stored in Supabase Storage using the S3-compatible API:
* **Supabase Project Reference:** `jmaclvnwiaycikaphxzs`
* **Storage Endpoint:** `https://jmaclvnwiaycikaphxzs.supabase.co/storage/v1/s3`
* **S3 Addressing Style:** `path`
* **Public Domain:** Configured in `frontend/next.config.ts` under `images.remotePatterns` (`jmaclvnwiaycikaphxzs.storage.supabase.co`).

### Backups & Rollbacks
* **Automated Backups:** Supabase performs daily automated database backups and Point-In-Time Recovery (PITR).
* **Django DBBackup:** The backend includes `django-dbbackup`, configured to archive database dumps into S3 (`database_backups/`).
  * Manual backup: `python manage.py dbbackup`
  * Manual restore: `python manage.py dbrestore`

---

## 6. Production Environment Variables Reference

Below is the complete reference table of environment variable **names** required across Render and Vercel.

> **CRITICAL SECURITY NOTE:** Actual values, passwords, private keys, and tokens are omitted and marked `<redacted>`.

### Backend Environment Variables (Render)

| Variable Name | Required | Default / Fallback | Purpose / Description |
| :--- | :---: | :--- | :--- |
| `SECRET_KEY` | **Yes** | *None (Fails in prod)* | Django cryptographic signing key. Must be a strong random 64+ char string. |
| `DEBUG` | **Yes** | `False` | Must be set to `False` in production to activate security middleware & HSTS. |
| `ALLOWED_HOSTS` | **Yes** | `localhost,127.0.0.1` | Comma-separated allowed hostnames (`lumeo-crm-backend.onrender.com,lumeo.estgrp.in`). |
| `DB_NAME` | **Yes** | `crm_saas` | Supabase PostgreSQL database name (typically `postgres`). |
| `DB_USER` | **Yes** | `postgres` | Supabase database user. |
| `DB_PASSWORD` | **Yes** | *None* | Supabase database password. |
| `DB_HOST` | **Yes** | `localhost` | Supabase database host (direct or connection pooler). |
| `DB_PORT` | **Yes** | `5432` | Database port (`6543` for transaction pooler, `5432` for direct). |
| `CORS_ALLOWED_ORIGINS`| **Yes** | *localhost* | Comma-separated allowed frontend origins (`https://lumeo.estgrp.in`). |
| `CSRF_TRUSTED_ORIGINS`| **Yes** | *localhost* | Comma-separated trusted origins for CSRF (`https://lumeo.estgrp.in`). |
| `FRONTEND_URL` | **Yes** | `http://localhost:3000` | Canonical frontend URL for invite links and password reset emails. |
| `TIME_ZONE` | No | `UTC` | Server timezone (e.g. `UTC` or `Asia/Kolkata`). |
| `ACCESS_TOKEN_MINUTES`| No | `30` | JWT access token lifespan in minutes. |
| `REFRESH_TOKEN_DAYS` | No | `7` | JWT refresh token lifespan in days. |
| `API_PAGE_SIZE` | No | `20` | Default DRF pagination limit. |
| `CELERY_TASK_ALWAYS_EAGER` | No | `True` | Runs Celery tasks synchronously in Gunicorn (eliminates need for worker). |
| `REDIS_URL` | No | `redis://127.0.0.1:6379/1` | Redis connection URL for caching / broker if worker is used. |
| `EMAIL_BACKEND` | No | `anymail.backends.resend...` | Email backend (Resend in production). |
| `EMAIL_HOST` | No | `smtp.resend.com` | SMTP host for Resend. |
| `EMAIL_PORT` | No | `465` | SMTP port (`465` for SSL). |
| `EMAIL_HOST_USER` | No | `resend` | SMTP username. |
| `EMAIL_HOST_PASSWORD` | No | *None* | Resend API key (`re_<redacted>`). |
| `EMAIL_USE_SSL` | No | `True` | SSL flag for port 465. |
| `DEFAULT_FROM_EMAIL` | **Yes** | *noreply* | Public sender email header (e.g. `BrandLumeo <info@brandlumeo.com>`). |
| `ADMIN_NOTIFICATION_EMAIL`| No | `support@crm.estgrp.in` | Internal notification email address. |
| `CRON_SECRET_KEY` | No | *default_key* | Authentication token for triggering automated scheduled tasks via API. |
| `AWS_ACCESS_KEY_ID` | **Yes** | *None* | Supabase Storage S3 access key ID for file uploads. |
| `AWS_SECRET_ACCESS_KEY`| **Yes** | *None* | Supabase Storage S3 secret key. |
| `AWS_STORAGE_BUCKET_NAME`| **Yes**| *None* | Supabase Storage bucket name. |
| `AWS_S3_ENDPOINT_URL` | **Yes** | *None* | Supabase S3 endpoint (`https://<project-ref>.supabase.co/storage/v1/s3`). |
| `AWS_S3_REGION_NAME` | **Yes** | *None* | S3 region (e.g. `ap-south-1`). |
| `AWS_S3_CUSTOM_DOMAIN`| No | *None* | Custom CDN domain for media files (`<project-ref>.storage.supabase.co`). |
| `RAZORPAY_KEY_ID` | No | *None* | Razorpay payment gateway API Key ID. |
| `RAZORPAY_KEY_SECRET` | No | *None* | Razorpay API Secret. |
| `RAZORPAY_WEBHOOK_SECRET`| No | *None* | Secret for verifying Razorpay payment webhook signatures. |
| `GOOGLE_CLIENT_ID` | No | *None* | Google OAuth client ID for Calendar / SSO sync. |
| `GOOGLE_CLIENT_SECRET`| No | *None* | Google OAuth client secret. |
| `META_APP_ID` | No | *None* | Meta / Facebook App ID for Lead Ads integration. |
| `META_APP_SECRET` | No | *None* | Meta App Secret. |
| `META_LEADGEN_VERIFY_TOKEN`| No | *None* | Webhook verification token for Meta Lead Ads. |
| `GEMINI_API_KEY` | No | *None* | Google Gemini API key for AI performance evaluations & leaderboard. |

### Frontend Environment Variables (Vercel)

| Variable Name | Required | Default / Example | Purpose / Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://lumeo-crm-backend.onrender.com/api/v1` | Base REST API URL accessed by browser clients. **Baked at build time.** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | *None* | Public Razorpay Key ID used by client-side checkout scripts. |
| `NEXT_PUBLIC_STRIPE_PK` | No | *None* | Public Stripe Key used by Stripe Elements. |

---

## 7. Verification & Post-Deployment Health Checks

### How to Confirm a Deploy Succeeded

1. **Check Live Web Application:**
   * Visit: `https://lumeo.estgrp.in`
   * Confirm the login screen loads and returns HTTP 200 without console errors.
2. **Check Backend API Readiness:**
   * Visit: `https://lumeo-crm-backend.onrender.com/admin/login/`
   * Confirm the Django administration login screen renders (verifies WSGI server + static files via WhiteNoise).
   * Visit: `https://lumeo-crm-backend.onrender.com/api/v1/accounts/me/`
   * Confirm it returns HTTP 401 Unauthorized (`{"detail": "Authentication credentials were not provided."}`) — proves DRF and database connectivity are operational.
3. **Check Critical Live Modules:**
   * Log in and test:
     * `/expenses` — Verify KPI cards calculate and ledger renders.
     * `/quotes` — Verify quotation list loads and PDF preview generates.
     * `/finance` — Verify month-filtering renders without transaction errors.
     * `/attendance` — Verify punch status card loads.

### Where to Inspect Build & Runtime Logs
* **Render Logs:**
  1. Open [Render Dashboard](https://dashboard.render.com).
  2. Select the Web Service: `lumeo-crm-backend`.
  3. View **"Logs"** tab for live stdout/stderr from Gunicorn and background tasks.
  4. View **"Events"** or **"Deploys"** tab to inspect output from `backend/build.sh` (pip installs, collectstatic, migrations).
* **Vercel Logs:**
  1. Open [Vercel Dashboard](https://vercel.com).
  2. Select project: `lumeo-crm-exjs`.
  3. Click **"Deployments"** and select the top (current) deployment.
  4. Inspect the **"Building"** tab to check page compilation traces.
  5. Inspect the **"Runtime Logs"** tab for edge function or SSR exceptions.

### Typical Build Times
* **Backend (Render):** ~1.5 to 3 minutes.
* **Frontend (Vercel):** ~1 to 2 minutes.

---

## 8. Rollback Procedures

### 1. Rolling Back the Frontend (Vercel)
Vercel keeps immutable build outputs for every deployment:
1. Navigate to **Vercel Dashboard** -> Project `lumeo-crm-exjs` -> **Deployments**.
2. Find the last known working deployment in the list.
3. Click the three-dot (`...`) action menu next to the deployment.
4. Select **"Instant Rollback"** (or **"Promote to Production"**).
5. Traffic immediately shifts to the previous build in under 5 seconds with zero build delay.

### 2. Rolling Back the Backend (Render)
1. Navigate to **Render Dashboard** -> Web Service `lumeo-crm-backend` -> **Deploys**.
2. Locate the previous successful deploy.
3. Click **"Rollback to this deploy"**.
4. Render boots the container image from the chosen deployment.

### 3. Rolling Back via Git (Recommended for Full Parity)
To keep the Git repository history aligned with production:
```bash
# Revert the faulty commit locally
git revert HEAD

# Verify local build passes
npm --prefix frontend run build

# Push the revert commit
git push origin main
```
Both Render and Vercel will immediately deploy the reverted state.

### 4. Database Rollbacks (Supabase)
* **Reverting Migrations:** If a new migration introduced an issue but is reversible:
  ```bash
  # Step back one migration on the target app
  python backend/manage.py migrate <app_name> <previous_migration_name>
  ```
* **Point-In-Time Recovery (PITR):** If data corruption occurred, navigate to **Supabase Dashboard** -> Database -> Backups, and restore the database to a snapshot prior to the deployment timestamp.

---

## 9. Production Gotchas & Past Resolved Issues

The following real issues have broken deploys in this repository in the past. Always review these before pushing changes:

### 1. `typescript.ignoreBuildErrors: false` in `next.config.ts`
* Next.js enforces strict type checking during `npm run build`.
* A single invalid type or missing property will cause Vercel's build to abort with exit code 1.
* **Rule:** Never push to `main` without running `npm --prefix frontend run build` first.

### 2. Missing `NEXT_PUBLIC_API_URL`
* Because Next.js renders static pages, `process.env.NEXT_PUBLIC_API_URL` is inlined at build time.
* If omitted in Vercel settings, [frontend/src/lib/api.ts](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/frontend/src/lib/api.ts) explicitly throws a build-halting error.
* Ensure the value includes the `/api/v1` path suffix (`https://lumeo-crm-backend.onrender.com/api/v1`).

### 3. Trailing Spaces in Supabase S3 Credentials
* Copying and pasting `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` into the Render dashboard can introduce trailing whitespace or newline characters.
* AWS v4 HMAC signature verification fails when headers contain unstripped whitespace, causing silent 500 errors on file uploads.
* [backend/config/settings.py](file:///c:/Users/MUHAMMAD%20SHAMIL%20CV/PycharmProjects/crm-saas/backend/config/settings.py) incorporates `.strip()` defensively on all AWS settings, but keys should always be pasted cleanly.

### 4. CORS with `withCredentials: true`
* The frontend uses HttpOnly cookie authentication for JWT tokens, requiring `withCredentials: true`.
* Browsers strictly reject cross-origin requests if `CORS_ALLOW_CREDENTIALS` is not `True` or if `Access-Control-Allow-Origin` is configured with a wildcard `*`.
* Ensure `CORS_ALLOWED_ORIGINS` in `settings.py` explicitly lists `https://lumeo.estgrp.in`.

### 5. CSRF Trusted Origins on Custom Domains
* Django rejects non-GET requests with HTTP 403 ("CSRF verification failed") if the origin is not listed in `CSRF_TRUSTED_ORIGINS`.
* Both `https://lumeo.estgrp.in` and `https://lumeo-crm-backend.onrender.com` are required in `CSRF_TRUSTED_ORIGINS`.

### 6. Date vs. Datetime in Django REST Framework DateFields
* Defining `models.DateField(default=timezone.now)` stores a Python `datetime` object on in-memory instances prior to database round-trips.
* DRF's `DateField.to_representation` raises an `AssertionError: Expected a date, but got a datetime` if serialized directly.
* **Rule:** Always use `default=timezone.localdate` for `models.DateField`.

### 7. Render Free/Starter Tier Cold Starts
* Render web services on basic tiers spin down after periods of inactivity.
* The first request from `lumeo.estgrp.in` after inactivity may take 30–50 seconds while the container initializes. This is normal infrastructure behavior and not a deployment defect.

---

## 10. CLI Tools & Machine Authentication Status

The local development environment relies on standard Git operations and GitHub webhook integrations rather than vendor-specific deployment CLIs:

| CLI Tool | Installed Locally | Authenticated | Deployment Role |
| :--- | :---: | :---: | :--- |
| `git` | **Yes** | **Yes** (HTTPS via GitHub Credential Manager) | Primary deployment driver via `git push origin main`. |
| `npm` / `node` | **Yes** (Node v24 / npm) | Local execution | Used for local pre-flight production builds (`npm run build`). |
| `python` | **Yes** (Python 3.12) | Local execution | Used for migrations and `pytest` test suite execution. |
| `vercel` CLI | **No** | N/A | **Not used.** Vercel deploys automatically via GitHub repo integration. |
| `render` CLI | **No** | N/A | **Not used.** Render deploys automatically via GitHub repo integration. |
| `gh` (GitHub CLI)| **No** | N/A | Git operations are handled directly via standard `git`. |
| `supabase` CLI | **No** | N/A | Migrations are handled by Django (`migrate --noinput` in `build.sh`). |

