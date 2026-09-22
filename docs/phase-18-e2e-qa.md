# Phase 18 End-to-End QA Checklist

## Setup Checks

- Confirm `EMAIL_SEND_MODE=mock`.
- Confirm backend dependencies are installed.
- Confirm frontend dependencies are installed.
- Confirm `backend/.env` is present locally but not staged.
- Confirm no real email send test is planned for this QA pass.

## Backend Checks

- `GET /api/health` returns `status: ok`.
- `GET /api/dashboard/summary` returns dashboard counts.
- `GET /api/notifications/summary` returns notification counts.
- `GET /api/campaigns` returns campaign rows.
- Existing routes import without syntax errors.

## Frontend Checks

- Dashboard route loads.
- Campaigns route loads.
- Lead Uploads route loads.
- Email Accounts route loads.
- Notifications route loads.
- Sidebar workflow links route to the correct existing workspace.
- Empty states are readable and do not look broken.
- Error states show clear messages.

## Dashboard Checks

- Summary cards are readable.
- Campaign overview rows are readable.
- Selecting a campaign opens the Campaigns workspace with that campaign selected.
- Recent activity is readable.
- Pending actions are easy to scan.
- Notification summary displays recent notification activity.

## Campaign Workflow Checks

- Campaign list loads.
- Campaign detail loads.
- Campaign summary, dashboard summary, activity timeline, lead timeline, leads, drafts, sent emails, replies, no-replies, decisions, notifications, and follow-up sections are visible.
- Section labels make the manual workflow understandable.
- Mock send mode is visible when the API reports mock mode.

## Draft Workflow Checks

- Draft listing works.
- Draft create and edit controls remain manual.
- Submit for approval remains manual.
- Approval does not send an email.
- Rejection remains manual.
- Status badges are readable.

## Reply Workflow Checks

- Replies display with sender, subject, and received date.
- Reply draft flow remains manual.
- Reply draft approval does not auto-send.
- Reply send action shows mock behavior when send mode is mock.
- Empty reply states are clear.

## No-Reply Workflow Checks

- No-reply list displays.
- Campaign no-reply checks remain manual.
- Sent-email no-reply checks remain manual.
- No automatic follow-up is created unless the user manually uses the existing follow-up draft flow.

## Follow-Up Workflow Checks

- Follow-up draft rows are understandable.
- Follow-up drafts are not sent automatically.
- Follow-up creation remains manual.
- Follow-up draft review state is clear.

## Notification Workflow Checks

- Notification list loads.
- Summary counts display.
- Filters by status, type, and priority work.
- Mark read, resolve, and archive actions are clear.
- Notification actions do not send emails or automate outreach.

## Timeline Checks

- Campaign activity timeline displays.
- Campaign lead timeline selector displays available campaign leads.
- Selecting a campaign lead updates the timeline.
- Timeline item labels and dates are readable.

## Known Safe-Mode Note

`EMAIL_SEND_MODE=mock` must remain active during Phase 18 QA. No real email should be sent during this QA pass.
