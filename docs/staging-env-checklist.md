# Staging Environment Checklist

## Backend Env Checklist

- `PORT` is set by the host or explicitly configured.
- `CLIENT_URL` points to the deployed frontend origin.
- `SUPABASE_URL` points to the staging Supabase project.
- `SUPABASE_ANON_KEY` is the staging anon key.
- `SUPABASE_SERVICE_ROLE_KEY` is stored backend-only.
- `DATABASE_URL` points to the staging database for trusted migration/admin use.
- `GOOGLE_CLIENT_ID` is configured for the staging OAuth client.
- `GOOGLE_CLIENT_SECRET` is stored backend-only.
- `GOOGLE_OAUTH_REDIRECT_URI` points to the deployed backend callback URL.
- `GOOGLE_OAUTH_SCOPES` includes Gmail send and readonly scopes if Gmail testing is approved.
- `EMAIL_SEND_MODE=mock`.
- `GHL_MODE=mock` unless approved.
- `GHL_API_BASE_URL=https://services.leadconnectorhq.com`.

## Frontend Env Checklist

- `VITE_API_BASE_URL` points to the deployed backend origin.
- Frontend env contains only client-safe values.
- No service role keys are included.
- No Gmail OAuth client secrets, access tokens, or refresh tokens are included.
- No generated `.env` file is committed.

## Supabase Checklist

- Staging uses a dedicated Supabase project.
- Migrations `001` through `012` have been applied in order.
- Service role key is backend-only.
- Demo data is non-sensitive or approved for staging.
- Backups or snapshots are available before migration testing.

## Gmail OAuth Checklist

- Google OAuth redirect URI matches the deployed backend callback.
- OAuth consent configuration is appropriate for staging.
- Test Gmail account is approved for staging use.
- OAuth tokens are not shown in frontend UI, API responses, logs, screenshots, or docs.
- Token storage remains a known production-hardening item before broad live use.

## Safety Checks

- `EMAIL_SEND_MODE=mock`.
- `GHL_MODE=mock` unless approved.
- `VITE_API_BASE_URL` points to deployed backend.
- `CLIENT_URL` points to deployed frontend.
- No real send tests are run without explicit approval.
- No cron, scheduler, automatic sending, or AI generation is enabled.

## Common Deployment Mistakes

- Setting `VITE_API_BASE_URL` to localhost in staging.
- Setting `CLIENT_URL` to the wrong frontend origin and causing CORS failures.
- Forgetting to update the Google OAuth redirect URI.
- Putting backend-only secrets in frontend env.
- Applying migrations to the wrong Supabase project.
- Leaving `EMAIL_SEND_MODE` unset and assuming live behavior is impossible.
- Running live email tests during staging smoke checks.

## Expected Staging Values

```bash
EMAIL_SEND_MODE=mock
GHL_MODE=mock
VITE_API_BASE_URL=https://<deployed-backend-origin>
CLIENT_URL=https://<deployed-frontend-origin>
```
