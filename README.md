# LeadRubyOrbit

LeadRubyOrbit — AI-Assisted Lead Outreach & Follow-up Management System

## Overview

LeadRubyOrbit is planned as a lead outreach and follow-up management platform for teams. Future phases will support lead uploads, workflow syncing, email draft approval, sending, reply checks, follow-up pausing, notifications, and team decisions.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Supabase PostgreSQL
- UI: Tailwind CSS + shadcn/ui
- Icons: Lucide React

## Phase Status

- Phase 0 completed: project foundation, dashboard shell, Express API, health route, and environment examples.
- Phase 1 completed: Supabase PostgreSQL schema migration, schema documentation, and backend database configuration placeholders.
- Phase 2 completed: multi-format lead upload, validation, preview, and import flow.
- Phase 3 completed: campaign management foundation with campaign CRUD, imported lead listing, and campaign lead attachment.
- Phase 4 completed: GoHighLevel integration foundation with mock-mode campaign lead sync.
- Phase 5 completed: email draft creation foundation with manual drafting, editing, approval, and rejection.
- Phase 6 completed: email account management foundation for future sending phases.
- Phase 7 completed: mock approved-email sending foundation with sent email history.
- Phase 8 completed: Gmail OAuth foundation for connecting Gmail accounts.
- Phase 9 completed: Gmail OAuth connection test passed for `incdatamart@gmail.com`.
- Phase 10 completed: real Gmail live send test passed; keep `EMAIL_SEND_MODE=mock` unless explicitly testing live sends.
- Phase 11 completed: Gmail reply monitoring foundation with manual Gmail readonly checks and campaign reply display.

## Phase 0 Scope

Phase 0 establishes the project foundation only:

- React/Vite frontend scaffold
- Tailwind CSS and shadcn/ui-style component setup
- Professional SaaS dashboard shell
- Express backend scaffold
- `/api/health` backend route
- Frontend API service for backend health status
- Environment example files

## Phase 1 Scope

Phase 1 adds the database foundation only:

- Initial schema migration at `backend/db/migrations/001_initial_schema.sql`
- Schema documentation at `backend/db/SCHEMA.md`
- Backend Supabase/PostgreSQL config placeholders
- Environment variable examples for Supabase and PostgreSQL

Later phases will add outreach execution workflows. The current project intentionally does not include authentication, AI, email sending, reply checking, follow-ups, notifications delivery, or workers.

## Phase 2 Scope

Phase 2 adds the lead upload module only:

- Multi-format parser support for CSV, XLSX/XLS, JSON, TXT, DOC/DOCX, and PDF
- Lead row normalization, validation, duplicate detection, and preview JSON storage
- Supabase-backed upload metadata and confirmed lead import
- Lead Uploads frontend page with upload, preview, summary, and confirm import controls

## Phase 3 Scope

Phase 3 adds the campaign management foundation only:

- Campaign CRUD APIs backed by the existing `campaigns` table
- Campaign lead attachment backed by the existing `campaign_leads` and `leads` tables
- Duplicate campaign-lead prevention for the same campaign and lead
- Simple imported leads API for attaching leads to campaigns
- Campaigns frontend page with list, create form, detail section, status badges, lead counts, and lead attachment controls

Phase 3 intentionally does not implement GHL, AI email generation, email sending, reply checking, follow-ups, authentication, or notification workflows.

## Phase 4 Scope

Phase 4 adds the GoHighLevel integration foundation only:

- GHL settings status API with `mock` and `live` modes
- Mock GHL client that simulates contact creation and workflow enrollment
- Campaign lead sync, retry failed sync, and sync status APIs
- Campaign-specific sync fields on `campaign_leads`
- Campaign detail UI section for mock/live status, sync controls, summary cards, and sync rows

Mock mode is the default and does not require real GoHighLevel credentials. No real GoHighLevel contacts or workflow enrollments are created in mock mode.

Live mode is scaffolded only. Real live sync requires `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`, and `GHL_WORKFLOW_ID`; if any are missing, the backend returns a clear error.

### GHL Environment Variables

```bash
GHL_MODE=mock
GHL_PRIVATE_INTEGRATION_TOKEN=
GHL_LOCATION_ID=
GHL_WORKFLOW_ID=
GHL_API_BASE_URL=https://services.leadconnectorhq.com
```

Phase 4 intentionally does not implement AI email generation, email sending, reply checking, follow-ups, authentication, or notification workflows.

## Phase 5 Scope

Phase 5 adds the email draft creation foundation only:

- Manual email draft APIs backed by the existing `email_drafts` table
- Draft creation, editing, approval, and rejection
- Campaign email draft listing with lead and campaign-lead context
- Campaign detail UI section for draft status summaries, draft table, create/edit form, and approval controls

Draft statuses are `draft`, `saved`, `approved`, and `rejected`. Phase 5 does not send emails. AI draft generation is not implemented yet.

## Phase 6 Scope

Phase 6 adds email account management only:

- Email account list, create, view, update, enable, disable, and archive APIs
- Email Accounts frontend page with summary cards, table actions, and create/edit form
- Provider values: `smtp`, `gmail`, `outlook`, `custom`
- Status values: `draft`, `active`, `disabled`, `archived`, `error`

Secrets are not exposed in API responses. Any accepted secret/password value is stored only as a placeholder for future encryption work. Phase 6 does not send emails.

## Phase 7 Scope

Phase 7 adds mock approved-email sending only:

- Mock email sending status API
- Send one approved draft in mock mode
- Send all approved drafts in a campaign in mock mode
- Sent email history backed by the existing `sent_emails` table
- Campaign detail UI section for sending mode, active account selection, approved draft sends, bulk campaign send, and sent email history

Mock sending creates `mock_msg_*` message IDs and `mock_thread_*` thread IDs, writes `sent_emails`, increments the selected email account's `sent_today`, and marks sent drafts as `sent`.

Send validation requires an approved draft, a lead email, an active enabled email account, and available daily send limit. Duplicate sends for the same draft are blocked or skipped.

Phase 7 does not send real emails. Real SMTP, Gmail, Outlook, OAuth, inbox integration, reply checking, follow-ups, AI draft generation, and automations are not implemented.

### Email Sending Environment Variables

```bash
EMAIL_SEND_MODE=mock
```

## Phase 11 Scope

Phase 11 adds manual Gmail reply monitoring only:

- Gmail readonly status API for reply monitoring readiness
- Manual sent-email reply check by Gmail thread ID
- Manual campaign-level reply check for sent or waiting-reply emails
- Reply persistence backed by the existing `replies` table
- Duplicate protection by `gmail_message_id`
- Sent email status updates to `replied` when a reply is detected
- Campaign lead outreach status updates to `replied`
- Campaign detail UI section with reply summary cards and a replies table

Reply monitoring is manual in this phase. No automatic follow-ups are sent, no AI reply generation is implemented, and no scheduler/background cron is active.

Gmail OAuth must include the readonly scope:

```bash
GOOGLE_OAUTH_SCOPES="https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
```

Security note: Gmail tokens stay backend-only and are never returned in API responses. The current placeholder token storage should be upgraded to production encryption/KMS before deployment. Do not commit `backend/.env`.

## API Endpoints

### Health

- `GET /api/health`

### Lead Uploads

- `POST /api/lead-uploads/upload`
- `GET /api/lead-uploads/:id/preview`
- `POST /api/lead-uploads/:id/confirm`

### Campaigns

- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:id`
- `PATCH /api/campaigns/:id`
- `POST /api/campaigns/:id/leads`
- `GET /api/campaigns/:id/leads`
- `GET /api/campaigns/:campaignId/email-drafts`

### Leads

- `GET /api/leads`

### GHL

- `GET /api/ghl/settings/status`
- `POST /api/ghl/campaigns/:campaignId/sync`
- `POST /api/ghl/campaigns/:campaignId/retry-failed`
- `GET /api/ghl/campaigns/:campaignId/sync-status`

### Email Drafts

- `GET /api/email-drafts`
- `POST /api/email-drafts`
- `GET /api/email-drafts/:id`
- `PATCH /api/email-drafts/:id`
- `POST /api/email-drafts/:id/approve`
- `POST /api/email-drafts/:id/reject`

### Email Accounts

- `GET /api/email-accounts`
- `POST /api/email-accounts`
- `GET /api/email-accounts/:id`
- `PATCH /api/email-accounts/:id`
- `POST /api/email-accounts/:id/enable`
- `POST /api/email-accounts/:id/disable`
- `POST /api/email-accounts/:id/archive`

### Email Sending

- `GET /api/email-sending/status`
- `POST /api/email-sending/send-draft/:draftId`
- `POST /api/email-sending/send-campaign/:campaignId`
- `GET /api/email-sending/campaigns/:campaignId/sent-emails`

### Gmail

- `GET /api/gmail/status`
- `GET /api/gmail/connect/:emailAccountId`
- `GET /api/gmail/oauth/callback`
- `POST /api/gmail/disconnect/:emailAccountId`

### Reply Monitoring

- `GET /api/reply-monitoring/status`
- `POST /api/reply-monitoring/check-sent-email/:sentEmailId`
- `POST /api/reply-monitoring/check-campaign/:campaignId`
- `GET /api/reply-monitoring/campaigns/:campaignId/replies`
- `GET /api/reply-monitoring/sent-emails/:sentEmailId/replies`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

## Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:5000` by default.

## Database Migration

The database migrations are located at:

```bash
backend/db/migrations/001_initial_schema.sql
backend/db/migrations/002_ghl_sync_fields.sql
backend/db/migrations/003_email_draft_fields.sql
backend/db/migrations/004_email_account_fields.sql
backend/db/migrations/005_sent_email_fields.sql
backend/db/migrations/006_gmail_oauth_fields.sql
backend/db/migrations/007_reply_monitoring_fields.sql
```

Apply these SQL migrations in a Supabase PostgreSQL project when you are ready to create or update the schema. Do not commit real `.env` files or secrets.

## Verify Phase 0

1. Start the backend with `npm run dev` from `backend/`.
2. Start the frontend with `npm run dev` from `frontend/`.
3. Open `http://localhost:5173`.
4. Confirm the dashboard loads and the backend connection status shows the health service as online.
5. Visit `http://localhost:5000/api/health` and confirm the JSON response.
