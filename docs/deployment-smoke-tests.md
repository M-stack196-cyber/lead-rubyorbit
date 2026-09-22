# Deployment Smoke Tests

Run these checks after staging deploys. Keep `EMAIL_SEND_MODE=mock` and do not run real send tests unless explicitly approved.

## API Smoke Tests

Replace `https://<deployed-backend-origin>` with the staging backend URL.

```bash
curl -sS https://<deployed-backend-origin>/api/health
curl -sS https://<deployed-backend-origin>/api/dashboard/summary
curl -sS https://<deployed-backend-origin>/api/notifications/summary
curl -sS https://<deployed-backend-origin>/api/campaigns
curl -sS https://<deployed-backend-origin>/api/email-sending/status
curl -sS https://<deployed-backend-origin>/api/gmail/status
```

Expected result: each endpoint should return JSON and a successful HTTP response. `GET /api/email-sending/status` should report mock mode for staging.

## Frontend Page Load Checks

- Open the deployed frontend URL.
- Confirm Dashboard loads.
- Confirm Campaigns page loads.
- Open a campaign detail view.
- Confirm Notifications page loads.
- Confirm Lead Uploads page loads.
- Confirm Email Accounts page loads.
- Confirm no browser console errors related to missing API base URL or CORS.

## Campaign Detail Check

- Open a test campaign.
- Confirm leads, drafts, sent emails, replies, team decisions, no-reply review, follow-up drafts, notifications, and timeline sections render.
- Confirm mock-mode messaging is visible where sending is shown.
- Do not click any live-send control if staging has ever been configured for live mode.

## Notifications Page Check

- Open Notifications.
- Confirm summary counts load.
- Confirm filters render.
- Confirm notification rows or empty states are readable.

## Dashboard Check

- Confirm summary cards load.
- Confirm pending actions load.
- Confirm recent activity loads.
- Confirm campaign overview rows load.

## Safety Notes

- Do not run real send tests in staging unless explicitly approved.
- Keep `EMAIL_SEND_MODE=mock`.
- Do not expose `.env` files, Gmail OAuth tokens, Supabase service role keys, or database URLs in screenshots or logs.
