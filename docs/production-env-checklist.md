# Production Environment Checklist

## Backend Env Variables Checklist

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

## Frontend Env Variables Checklist

- `VITE_API_BASE_URL`

Frontend env must contain only client-safe values. Do not place backend secrets, service role keys, OAuth secrets, access tokens, refresh tokens, or database URLs in frontend configuration.

## Supabase Production Checklist

- Dedicated production Supabase project exists.
- Migrations `001` through `012` are applied in order.
- Backup or restore point exists before launch.
- Service role key is stored backend-only.
- Database access is limited to approved operators.
- Production data handling has business approval.

## Gmail OAuth Production Checklist

- Production Google OAuth client is configured.
- Authorized redirect URI matches `https://<production-backend-domain>/api/gmail/oauth/callback`.
- `GOOGLE_OAUTH_REDIRECT_URI` uses the production backend callback.
- Gmail OAuth client secret is backend-only.
- OAuth tokens are not exposed in frontend/API responses.
- Production token storage hardening is reviewed before broad live use.

## Domain/DNS Checklist

- Production frontend domain selected.
- Production backend domain selected.
- DNS records configured.
- HTTPS/TLS enabled.
- Frontend build points to production backend through `VITE_API_BASE_URL`.
- Backend OAuth callback domain matches the Google OAuth configuration.

## CORS Checklist

- `CLIENT_URL` is set to the production frontend origin.
- Localhost and staging origins are removed from production config unless explicitly needed for a controlled test.
- Browser requests from the production frontend succeed.
- Requests from unapproved origins are not intentionally allowed.

## Safety Checklist

- `EMAIL_SEND_MODE=mock` until written approval.
- `GHL_MODE=mock` until written approval.
- No real send tests are run without approval.
- No automatic sending, cron, scheduler, or AI generation is enabled.
- No generated build output is committed.
- No production secrets are added to docs or the repository.

## Secret Handling Checklist

- Store secrets only in hosting provider secret management.
- Rotate any secret that may have been exposed.
- Do not print secrets in deployment logs.
- Do not include secrets in screenshots, issue logs, or QA results.
- Restrict access to production env settings.
- Review logs for accidental secret exposure after deployment.

## Values That Must Remain Backend-Only

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `GOOGLE_CLIENT_SECRET`
- Gmail access tokens
- Gmail refresh tokens
- `GHL_PRIVATE_INTEGRATION_TOKEN`
- Any production API secret or private credential

## Values Allowed In Frontend

- `VITE_API_BASE_URL`
- Public, client-safe display/config values intentionally approved for browser use

Do not add a Supabase anon key to frontend env unless a future frontend Supabase client is intentionally introduced and reviewed.

## Email Sending Approval Warning

`EMAIL_SEND_MODE` should remain `mock` until written business, technical, security, and compliance approval is recorded. Do not switch production to live sending as part of deployment planning.
