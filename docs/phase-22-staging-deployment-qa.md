# Phase 22 Staging Deployment QA

## QA Goal

Validate the deployed LeadRubyOrbit staging environment after frontend and backend deployment while keeping the system mock-safe and avoiding real outreach.

## Required Staging URLs

- Frontend URL: `https://<staging-frontend-url>`
- Backend URL: `https://<staging-backend-url>`
- Supabase project ref/name: `<staging-supabase-project>`

## Required Safe Values

- `EMAIL_SEND_MODE=mock`
- `GHL_MODE=mock` unless live GHL testing has explicit approval

## Staging Prerequisites

- Frontend and backend are deployed from the intended commit.
- Backend env variables are configured in the hosting platform.
- Frontend `VITE_API_BASE_URL` points to the deployed backend.
- Backend `CLIENT_URL` points to the deployed frontend.
- Supabase migrations `001` through `012` are applied in order.
- Demo data is non-sensitive or approved for staging.
- No real send test is planned unless explicitly approved.

## Backend Smoke Test Checklist

- `GET /api/health` returns a successful response.
- `GET /api/dashboard/summary` returns dashboard data or a valid empty state.
- `GET /api/notifications/summary` returns notification counts.
- `GET /api/campaigns` returns campaign data or a valid empty list.
- `GET /api/email-sending/status` confirms mock mode.
- `GET /api/gmail/status` returns Gmail readiness/status without tokens.

## Frontend Smoke Test Checklist

- Deployed frontend loads without a blank screen.
- Dashboard loads.
- Campaigns page loads.
- Lead Uploads page loads.
- Email Accounts page loads.
- Notifications page loads.
- Browser console has no API base URL or CORS errors.
- Network calls target the deployed backend URL.

## API Endpoint Test Checklist

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/notifications/summary`
- `GET /api/campaigns`
- `GET /api/email-sending/status`
- `GET /api/gmail/status`
- `GET /api/reply-monitoring/status`
- `GET /api/no-reply-monitoring/status`
- `GET /api/ghl/settings/status`

## Campaign Workflow QA

- Campaign list displays existing campaigns or a clear empty state.
- Campaign detail opens for a test campaign.
- Campaign leads display correctly.
- Campaign dashboard summary and activity sections render.
- No campaign action triggers automatic outreach.

## Draft Workflow QA

- Draft list displays for a campaign.
- Draft create/edit controls remain manual.
- Submit for approval remains manual.
- Approve/reject controls behave as expected for staging data.
- Approval does not send email automatically.

## Mock Send QA

- Email sending status reports `mock`.
- Manual mock send creates or displays mock send workflow records only when intentionally tested.
- Mock send results use mock message/thread identifiers.
- No real recipient receives an email.

## Gmail OAuth/Account Status QA

- Email Accounts page displays Gmail account connection status.
- `GET /api/gmail/status` does not expose access tokens or refresh tokens.
- OAuth redirect configuration is correct for staging if connection testing is included.
- Do not show OAuth secrets or tokens in screenshots.

## Reply Monitoring QA

- Reply monitoring status endpoint responds.
- Replies section displays detected replies or a clear empty state.
- Manual reply checks are not scheduled or automatic.
- Reply records attach to the expected campaign context.

## Team Decision QA

- Team decision rows display when available.
- Decision status and action fields are readable.
- Manual decision actions do not send emails automatically.
- Completed/cancelled decisions remain understandable in the UI.

## No-Reply QA

- No-reply status endpoint responds.
- No-reply section displays eligible records or a clear empty state.
- No-reply checks remain manual.
- No automatic follow-up is sent.

## Follow-Up Draft QA

- Follow-up draft rows display when available.
- Follow-up draft creation/review remains manual.
- Follow-up draft approval does not automatically send.
- Mock-safe messaging is visible where sending is referenced.

## Notification QA

- Notifications page loads.
- Summary counts display.
- Filters render and can be used.
- Read, resolve, and archive actions remain notification-only workflow actions.
- No notification action sends email or automates outreach.

## Dashboard/Timeline QA

- Dashboard summary cards load.
- Recent activity loads.
- Pending actions load.
- Campaign overview rows load.
- Campaign activity timeline renders.
- Lead or campaign-lead timeline renders for available demo data.

## Security/Safety QA

- `EMAIL_SEND_MODE=mock` is confirmed.
- `GHL_MODE=mock` is confirmed unless approved.
- Frontend does not expose backend-only env values.
- Gmail OAuth access and refresh tokens are not returned in API responses.
- Supabase service role key is not present in frontend env or browser output.
- Screenshots do not expose `.env` files, secrets, tokens, database URLs, or service role keys.
- No cron, scheduler, automatic sending, or AI generation is active.

## Known Staging Limitations

- Authentication and role-based access are not implemented yet.
- Gmail token storage remains a production-hardening item.
- Sending must remain mock unless live sending is explicitly approved.
- Follow-up, reply checks, no-reply checks, and decisions are manual.
- Staging data may be seeded, partial, or synthetic.

## Pass/Fail Signoff Template

- QA run date:
- Frontend URL:
- Backend URL:
- Supabase project:
- Tested commit:
- Tester:
- Overall status: `Pass` / `Pass with issues` / `Fail`
- Blocking issues:
- Non-blocking issues:
- Confirmation: `EMAIL_SEND_MODE=mock`
- Confirmation: no real email sent
- Approval to proceed:
- Signoff owner:
