# Phase 21 Deployment Setup

## Deployment Goal

Prepare LeadRubyOrbit for a safe staging deployment that can be used for demo review, stakeholder QA, and deployment validation without enabling live outreach or new product behavior.

## Recommended Staging Architecture

- Frontend: hosted static React/Vite build.
- Backend: hosted Node.js/Express API.
- Database: dedicated Supabase staging project.
- Environment: separate staging environment variables, never local `.env` files.
- Email safety: `EMAIL_SEND_MODE=mock`.
- GHL safety: `GHL_MODE=mock` unless live sync is explicitly approved.

## Frontend Deployment Option

Deploy the `frontend/` app to a static hosting platform that supports Vite builds.

- Build command: `npm run build`
- Output directory: `dist`
- Required env: `VITE_API_BASE_URL`
- `VITE_API_BASE_URL` must point to the deployed backend API origin.

Do not commit or deploy generated `frontend/dist` output from the repository.

## Backend Deployment Option

Deploy the `backend/` app to a Node.js hosting platform.

- Install command: `npm install`
- Start command: `npm start`
- Health endpoint: `GET /api/health`
- Required env: backend variables listed below.

The backend should be the only place where service role keys, database admin URLs, Gmail OAuth client secrets, and Gmail token handling are configured.

## Supabase Production/Staging Setup

- Use a dedicated staging Supabase project before production.
- Apply migrations in order from `001_initial_schema.sql` through `012_notification_system_fields.sql`.
- Keep staging data separate from production data.
- Store Supabase service role key only in backend hosting environment variables.
- Do not expose service role keys to frontend builds, logs, screenshots, or docs.

## Required Backend Environment Variables

- `PORT`
- `CLIENT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_SCOPES`
- `EMAIL_SEND_MODE`
- `GHL_MODE`
- `GHL_PRIVATE_INTEGRATION_TOKEN`
- `GHL_LOCATION_ID`
- `GHL_WORKFLOW_ID`
- `GHL_API_BASE_URL`

## Required Frontend Environment Variables

- `VITE_API_BASE_URL`

Frontend environment variables must be client-safe. Do not place Gmail OAuth secrets, refresh tokens, access tokens, database URLs, or Supabase service role keys in frontend env.

## Gmail OAuth Redirect URI Deployment Note

The deployed Google OAuth callback must match the backend route:

```text
https://<deployed-backend-origin>/api/gmail/oauth/callback
```

The same value should be configured in `GOOGLE_OAUTH_REDIRECT_URI` and in the Google Cloud OAuth client allowed redirect URIs.

## CORS CLIENT_URL Deployment Note

Set `CLIENT_URL` on the backend to the deployed frontend origin, for example:

```text
https://<deployed-frontend-origin>
```

If the frontend origin changes, update `CLIENT_URL` before smoke testing browser workflows.

## Staging Safety Note

Use this value for staging unless a separate written approval says otherwise:

```bash
EMAIL_SEND_MODE=mock
```

Mock mode is the safe deployment default. It allows workflow validation without sending real email.

## Migration Deployment Checklist

- Confirm the target database is staging, not production.
- Confirm migrations `001` through `012` are available.
- Apply migrations in numeric order.
- Stop if any migration fails.
- Verify expected tables and columns exist after migration.
- Do not create new migrations during Phase 21.

## Backend Deployment Checklist

- Configure backend env variables in the hosting platform.
- Keep `EMAIL_SEND_MODE=mock`.
- Keep `GHL_MODE=mock` unless approved.
- Confirm `CLIENT_URL` equals the deployed frontend origin.
- Confirm `GOOGLE_OAUTH_REDIRECT_URI` equals the deployed backend callback URL.
- Confirm logs do not expose secrets or OAuth tokens.
- Confirm `GET /api/health` returns a successful response.

## Frontend Deployment Checklist

- Configure `VITE_API_BASE_URL` to the deployed backend origin.
- Run `npm run build`.
- Deploy only generated build artifacts through the hosting platform.
- Confirm Dashboard, Campaigns, Lead Uploads, Email Accounts, and Notifications load.
- Confirm frontend network calls target the deployed backend.

## Post-Deployment Smoke Tests

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/notifications/summary`
- `GET /api/campaigns`
- `GET /api/email-sending/status`
- `GET /api/gmail/status`
- Frontend Dashboard page loads.
- Campaigns page loads.
- Campaign detail opens for a test campaign.
- Notifications page loads.

Do not run real send tests in staging unless explicitly approved. Keep `EMAIL_SEND_MODE=mock`.

## Rollback Notes

- Record the deployed frontend and backend versions before release.
- Keep the previous deployment available until smoke tests pass.
- If frontend deployment fails, roll back to the previous frontend build.
- If backend deployment fails, roll back to the previous backend version.
- If migration validation fails, stop deployment and restore from the staging backup or snapshot plan.
- Re-run smoke tests after rollback.

## What Not To Enable Yet

- Do not enable live email sending.
- Do not switch `EMAIL_SEND_MODE` from `mock`.
- Do not enable automatic sending, cron, or scheduler behavior.
- Do not add AI generation.
- Do not expose Gmail OAuth tokens.
- Do not expose Supabase service role keys to frontend code.
- Do not use real customer outreach data unless approved for staging.
