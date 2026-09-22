# Production Release Checklist

## Pre-Release Checks

- Approved production commit identified.
- Staging QA completed.
- Known staging issues reviewed.
- Production environment variables prepared in secret management.
- Production frontend and backend domains confirmed.
- Google OAuth production redirect URI confirmed.
- CORS production origin confirmed.
- `EMAIL_SEND_MODE=mock` confirmed unless written live-send approval exists.
- `GHL_MODE=mock` confirmed unless written live GHL approval exists.

## Migration Checks

- Target Supabase project is production.
- Backup or restore point created.
- Migrations `001` through `012` reviewed.
- Migrations are applied in numeric order.
- Migration result is verified.
- No new migration is created for Phase 23.

## Deployment Checks

- Backend deployed from the approved commit.
- Frontend deployed from the approved commit.
- Frontend build output is not committed to the repo.
- Backend starts successfully.
- Frontend loads successfully.
- Backend logs do not expose secrets.
- Frontend browser output does not expose backend-only values.

## Post-Release Smoke Tests

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/notifications/summary`
- `GET /api/campaigns`
- `GET /api/email-sending/status`
- `GET /api/gmail/status`
- Dashboard page load.
- Campaigns page load.
- Campaign detail page load.
- Notifications page load.
- Email Accounts page load.
- Confirm no real email is sent during smoke tests.

## Security Checks

- `SUPABASE_SERVICE_ROLE_KEY` is backend-only.
- `DATABASE_URL` is backend-only.
- Gmail OAuth client secret is backend-only.
- Gmail access and refresh tokens are not exposed.
- `VITE_API_BASE_URL` is the only required frontend env value.
- HTTPS is active.
- CORS allows the production frontend origin.
- Logs and screenshots do not contain secrets.

## Rollback Decision Points

- Backend health endpoint fails.
- Frontend fails to load.
- CORS blocks production frontend API calls.
- Production env is misconfigured.
- Migration validation fails.
- Secrets appear in logs or browser output.
- Email sending mode is not the approved value.
- Any smoke test indicates data corruption or unintended outreach behavior.

## Approval/Signoff Table

| Role | Name | Approval status | Date | Notes |
| --- | --- | --- | --- | --- |
| Business owner |  |  |  |  |
| Technical owner |  |  |  |  |
| Security owner |  |  |  |  |
| Compliance/outreach owner |  |  |  |  |

## Release Notes Template

- Release date:
- Commit:
- Frontend domain:
- Backend domain:
- Supabase project:
- Summary:
- Docs referenced:
- Migrations applied:
- `EMAIL_SEND_MODE`:
- `GHL_MODE`:
- Known issues:
- Rollback contact:

## Incident Notes Template

- Incident date/time:
- Detected by:
- Area:
- Severity:
- User impact:
- Immediate action taken:
- Rollback required: `Yes` / `No`
- Root cause:
- Resolution:
- Follow-up actions:
- Owner:
