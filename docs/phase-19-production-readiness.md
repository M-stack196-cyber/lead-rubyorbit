# Phase 19 Production Readiness Review

## Repo Safety Checklist

- `.gitignore` protects local env files, uploads, logs, build output, and `node_modules`.
- Real `.env` files must stay local and unstaged.
- `backend/uploads`, `uploads`, `frontend/dist`, and generated logs must stay unstaged.
- Secret scans should report only placeholder/example references before deployment.

## Environment Variable Checklist

- `EMAIL_SEND_MODE=mock` is the known safe default.
- `SUPABASE_URL` is set only in the backend deployment environment unless a frontend public client is intentionally introduced.
- `SUPABASE_ANON_KEY` may be public when needed by frontend code.
- `SUPABASE_SERVICE_ROLE_KEY` is backend-only and must never be exposed to frontend builds.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` are configured in the backend environment only.
- `GHL_MODE=mock` remains the safe default unless live sync is approved.
- `DATABASE_URL` is used only for trusted migration/admin workflows.

## Supabase Migration Checklist

- Apply migrations in order from `001_initial_schema.sql` through `012_notification_system_fields.sql`.
- Apply migrations to a staging Supabase project before production.
- Confirm indexes and constraints apply cleanly.
- Confirm no migration contains real secrets.
- Do not run application traffic against a partially migrated database.

## Gmail OAuth Checklist

- Confirm OAuth redirect URI matches the deployed backend callback URL.
- Confirm OAuth scopes are limited to the required Gmail send and readonly scopes.
- Confirm OAuth tokens are never returned to frontend responses.
- Replace placeholder token storage with production encryption or KMS before broad production use.
- Disconnect test Gmail accounts before switching to production credentials if needed.

## Email Sending Checklist

- Keep `EMAIL_SEND_MODE=mock` for QA and pre-production verification.
- Confirm send buttons are manual user actions.
- Confirm approval does not automatically send.
- Confirm campaign send remains a manual action.
- Enable live sending only after explicit business approval and a documented test plan.

## Frontend Deployment Checklist

- Build with `npm run build` from `frontend/`.
- Confirm frontend environment contains only public client-safe values.
- Confirm navigation loads Dashboard, Campaigns, Lead Uploads, Email Accounts, and Notifications.
- Confirm Campaigns workflow surfaces are usable on desktop and mobile widths.

## Backend Deployment Checklist

- Install backend dependencies.
- Configure backend-only environment variables on the hosting platform.
- Confirm `/api/health` returns `status: ok`.
- Confirm CORS `CLIENT_URL` matches the deployed frontend URL.
- Confirm logs do not print secrets or OAuth tokens.

## Pre-Live QA Checklist

- Run frontend lint and build.
- Run backend import/syntax checks.
- Smoke test dashboard, notifications, campaigns, and timeline endpoints.
- Walk through upload, campaign detail, draft approval, mock send, reply review, no-reply review, follow-up draft review, notifications, and timelines.
- Confirm no real email is sent during QA while `EMAIL_SEND_MODE=mock`.

## Rollback Checklist

- Keep the previous working deployment available.
- Record the deployed commit SHA.
- If deployment fails, restore the previous backend and frontend versions.
- If a migration fails, stop deployment and restore from Supabase backup or snapshot according to the database rollback plan.
- Re-run smoke tests after rollback.

## Known Safe Default

`EMAIL_SEND_MODE=mock` is the safe default. Real sending must be explicitly enabled only after business approval.
