# Phase 23 Production Deployment Plan

## Phase Goal

Create a production deployment plan for LeadRubyOrbit before any real production launch, live outreach, or customer-facing release.

## Production Launch Assumptions

- Staging deployment QA has passed or known issues have approved workarounds.
- Production deployment uses separate frontend, backend, and Supabase production environments.
- Production data is approved for use by the business.
- `EMAIL_SEND_MODE` remains `mock` until written approval is granted.
- No automatic sending, scheduler, cron, or AI generation is enabled.

## Required Production Approvals

- Business approval for production deployment.
- Technical approval for backend, frontend, and Supabase configuration.
- Security approval for secret handling and OAuth configuration.
- Compliance approval for outreach policy, recipient data, consent, and sender identity.
- Written approval before enabling live email sending.
- Written approval before enabling live GoHighLevel sync.

## Production Architecture Plan

- Frontend: production static React/Vite deployment.
- Backend: production Node.js/Express API deployment.
- Database: dedicated Supabase production project.
- Domains: approved frontend and backend production domains.
- Secrets: stored only in production hosting secret management.
- Email: mock mode until live sending is approved.
- Integrations: Gmail OAuth and GHL configured only after approval gates are satisfied.

## Frontend Production Plan

- Build from the approved production commit.
- Configure only client-safe environment variables.
- Set `VITE_API_BASE_URL` to the production backend origin.
- Deploy generated build artifacts through the hosting platform.
- Do not commit generated `frontend/dist` output.
- Validate Dashboard, Campaigns, Lead Uploads, Email Accounts, and Notifications after deploy.

## Backend Production Plan

- Deploy the approved backend commit to a Node.js production host.
- Configure backend-only environment variables in host secrets.
- Set `CLIENT_URL` to the production frontend origin.
- Confirm `GET /api/health` returns a successful response.
- Confirm logs do not expose secrets, OAuth tokens, service role keys, or database URLs.
- Keep `EMAIL_SEND_MODE=mock` until written approval.

## Supabase Production Plan

- Create a dedicated production Supabase project.
- Apply migrations `001` through `012` in order.
- Keep production separate from staging.
- Configure backups before production traffic.
- Store service role key backend-only.
- Restrict production database access to approved operators.

## Domain and DNS Plan

- Choose production frontend domain: `https://<production-frontend-domain>`.
- Choose production backend domain: `https://<production-backend-domain>`.
- Configure DNS records in the domain provider.
- Configure HTTPS/TLS for both domains.
- Confirm frontend requests target the production backend domain.
- Confirm backend CORS allows only the production frontend origin.

## Environment Variable Mapping

Backend production variables:

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

Frontend production variables:

- `VITE_API_BASE_URL`

## Gmail OAuth Production Redirect URI Plan

Use the production backend callback URL:

```text
https://<production-backend-domain>/api/gmail/oauth/callback
```

This value must match `GOOGLE_OAUTH_REDIRECT_URI` and the allowed redirect URI in the Google Cloud OAuth client.

## CORS CLIENT_URL Production Plan

Set backend `CLIENT_URL` to the production frontend origin:

```text
https://<production-frontend-domain>
```

Do not leave `CLIENT_URL` pointed at localhost or staging in production.

## EMAIL_SEND_MODE Approval Gate

`EMAIL_SEND_MODE` should remain `mock` until written business and technical approval is recorded. Switching to `live` requires:

- Approved sender account.
- Approved recipient data.
- Approved outreach content and compliance review.
- Successful controlled live-send test plan.
- Rollback plan for disabling live sending.

## GHL_MODE Approval Gate

`GHL_MODE` should remain `mock` unless live GoHighLevel sync is explicitly approved. Switching to live requires:

- Approved GHL credentials.
- Approved location and workflow IDs.
- Test plan with non-sensitive or approved contacts.
- Rollback plan for disabling live sync.

## Migration Plan

- Confirm the target is production Supabase.
- Confirm a backup or restore point exists.
- Apply migrations `001` through `012` in numeric order.
- Stop immediately if any migration fails.
- Verify schema objects after migration.
- Do not create new migrations during Phase 23.

## Backup/Rollback Plan

- Record deployed frontend and backend commit SHAs.
- Capture Supabase backup or restore point before migration.
- Keep previous frontend and backend deployments available.
- If smoke tests fail, roll back frontend/backend to previous versions.
- If database migration validation fails, stop launch and follow the Supabase restore plan.
- Keep `EMAIL_SEND_MODE=mock` during rollback verification.

## Monitoring/Logging Plan

- Monitor backend health and error rates.
- Monitor frontend load errors and API failures.
- Monitor Supabase query/API errors.
- Monitor Gmail OAuth connection errors without logging token values.
- Monitor email sending status, especially before any live-send approval.
- Keep logs free of secrets, access tokens, refresh tokens, service role keys, and database URLs.

## Security Checklist

- Production `.env` values are configured only in hosting secret storage.
- `SUPABASE_SERVICE_ROLE_KEY` is backend-only.
- Gmail OAuth secrets are backend-only.
- Gmail access and refresh tokens are not exposed in frontend/API responses.
- Frontend env contains only client-safe values.
- HTTPS is enabled for frontend and backend.
- CORS is restricted to the production frontend origin.
- Production screenshots and logs do not reveal secrets.

## Compliance/Outreach Approval Checklist

- Outreach policy approved.
- Sender identity approved.
- Recipient data source approved.
- Consent or legal basis reviewed.
- Email content reviewed.
- Unsubscribe/compliance requirements reviewed before live outreach.
- Rate limits and sender reputation plan approved.
- Live sending approval recorded before changing `EMAIL_SEND_MODE`.

## Production Smoke-Test Plan

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/notifications/summary`
- `GET /api/campaigns`
- `GET /api/email-sending/status`
- `GET /api/gmail/status`
- Frontend Dashboard loads.
- Campaigns page loads.
- Campaign detail opens.
- Notifications page loads.
- Email Accounts page loads.
- Confirm email sending status remains mock unless live approval is recorded.

## Go/No-Go Checklist

- Production deployment commit approved.
- Environment variables reviewed.
- Production Supabase migration plan approved.
- Backup/rollback plan approved.
- Gmail OAuth production callback configured.
- CORS production origin configured.
- Staging QA complete.
- Production smoke tests ready.
- Security checklist complete.
- Compliance/outreach checklist complete.
- `EMAIL_SEND_MODE` approval gate reviewed.

## Final Signoff Template

- Production launch date:
- Production frontend domain:
- Production backend domain:
- Supabase production project:
- Deployment commit:
- Business approver:
- Technical approver:
- Security approver:
- Compliance/outreach approver:
- `EMAIL_SEND_MODE` value:
- `GHL_MODE` value:
- Overall decision: `Go` / `No-go`
- Notes:

## What Remains Blocked Before Live Sending

- Written business approval for live sending.
- Compliance approval for outreach content and recipient data.
- Production-grade Gmail token storage review.
- Approved sender account and live-send test plan.
- Confirmation that `EMAIL_SEND_MODE=live` can be rolled back quickly.
- Confirmation that no automatic sending, scheduler, or cron behavior has been introduced.
