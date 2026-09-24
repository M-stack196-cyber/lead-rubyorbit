# LeadRubyOrbit

LeadRubyOrbit — AI-Assisted Lead Outreach & Follow-up Management System

## Overview

LeadRubyOrbit is a controlled lead outreach and follow-up management platform for teams. The current codebase supports lead intake, campaign workflows, draft review, mock-safe sending, Gmail OAuth/reply monitoring, no-reply handling, follow-up draft review, team decisions, notifications, analytics, auth/RBAC, workspace scoping, and production-security foundations.

The project is ready for local demo and staging validation. It is not production-live until migrations are applied in staging, `AUTH_REQUIRED=true` is tested with real users, CI/CD is enabled, and live email/GHL modes receive explicit approval.

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
- Phase 12 completed: team decision system after reply detection.
- Phase 13 completed: reply draft handling and manual reply workflow.
- Phase 14 completed: no-reply timeout handling for manual team review.
- Phase 15 completed: follow-up creation cycle for no-reply emails.
- Phase 16 completed: notification system for workflow visibility.
- Phase 17 completed: dashboard and lead timeline visibility.
- Phase 18 completed: frontend workflow polish and end-to-end QA checklist.
- Phase 19 completed: production readiness review, deployment safety documentation, and repo/env hardening.
- Phase 20 completed: final demo preparation, handoff documentation, screenshot checklist, and project summary.
- Phase 21 completed: staging deployment setup documentation, environment checklist, and smoke-test guide.
- Phase 22 completed: staging deployment QA checklist, QA results template, and issue log template.
- Phase 23 completed: production deployment planning documentation, environment checklist, and release checklist.
- Phase 24 completed: security hardening and access control planning documentation, role matrix, and hardening checklist.
- Phase 25 completed: authentication and RBAC implementation planning documentation, roadmap, and test plan.
- Phase 26 completed: production/security implementation foundation with auth/RBAC, workspace ownership, RLS migrations, OAuth state persistence, token encryption, request validation, audit logs, lead operations, AI-style draft generation, analytics, automation controls, realtime in-app notifications, and admin readiness UI.

## Current Phase 26 Implementation

Phase 26 adds the production/security foundation that supersedes the older planning-only notes in phases 24 and 25:

- Supabase Auth bearer-token verification when `AUTH_REQUIRED=true`
- Admin, Manager, Operator, and Viewer permission gates
- Workspace resolution and backend query scoping
- Workspace/RLS migrations for staging verification
- Security headers, JSON body limits, rate limits, and sensitive endpoint throttling
- Request validation middleware across mutating routes
- Audit logging and admin audit log UI
- Gmail OAuth callback state persistence and expiry validation
- Gmail token encryption utility with `TOKEN_ENCRYPTION_KEY`
- Protected Gmail status route; public health and OAuth callback remain intentionally public
- AI-style cold email draft generation that creates drafts only and requires approval before send
- Lead tags, scoring, search, filters, dedupe keys, and import history support
- Analytics APIs for overview, campaign performance, and sender performance
- Background automation service for reply checks, no-reply checks, and follow-up draft creation, disabled unless explicitly enabled
- Realtime in-app notification WebSocket refresh
- Workflow Settings admin readiness panel for send mode, Gmail OAuth, sender limits, and automation status

Safety defaults remain:

- `EMAIL_SEND_MODE=mock`
- `EMAIL_SEND_LIVE_APPROVED=false`
- `GHL_MODE=mock`
- Background automation disabled unless `BACKGROUND_AUTOMATION_ENABLED=true`

Before production, apply migrations in staging, test `AUTH_REQUIRED=true` with real role users, verify RLS isolation, and keep live sending disabled until business and technical approval are complete.

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

Later phases add outreach execution workflows. Historical notes below describe the project as it existed in earlier phases; the current Phase 26 implementation now includes auth/RBAC, mock-safe sending, reply/no-reply workflows, follow-up draft workflows, in-app notifications, AI-style draft generation, analytics, and opt-in automation.

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

## Phase 13 Scope

Phase 13 adds manual reply draft handling only:

- Reply draft listing by workspace, campaign, and reply
- Reply draft lifecycle: `saved`, `pending_approval`, `approved`, `rejected`, and `sent`
- Saved and rejected reply drafts can be edited
- Reply drafts can be submitted for approval, approved, rejected with a reason, and sent manually
- Approved reply drafts can be sent through the existing sending foundation
- `EMAIL_SEND_MODE=mock` creates mock sent-email records and prevents real email sending
- Live sending remains a manual action and uses Gmail only when `EMAIL_SEND_MODE=live` and a connected enabled Gmail account is available

Phase 13 does not add automatic reply generation, automatic follow-up sending, schedulers, or cron workers. Sending is manual only.

## Phase 14 Scope

Phase 14 adds no-reply timeout handling only:

- Sent emails are considered no-reply only when their status is `sent` or `waiting_reply`, `sent_at` exists, no reply exists for that sent email, and the current time is after `sent_at + timeoutDays`
- Default timeout is 3 days, with API validation for 1 to 30 days
- No-reply checks mark sent emails as `no_reply`, update campaign lead outreach state, and create a pending team decision for manual review
- Duplicate checks do not create duplicate pending no-reply decisions
- Campaign detail UI includes no-reply status summaries, campaign checks, individual sent-email checks, and no-reply lead review rows

Phase 14 does not send follow-ups automatically. Follow-up sending remains manual or a future phase.

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
- `GET /api/campaigns/:campaignId/reply-drafts`

### Leads

- `GET /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`

### GHL

- `GET /api/ghl/settings/status`
- `POST /api/ghl/campaigns/:campaignId/sync`
- `POST /api/ghl/campaigns/:campaignId/retry-failed`
- `GET /api/ghl/campaigns/:campaignId/sync-status`

### Email Drafts

- `GET /api/email-drafts`
- `POST /api/email-drafts`
- `POST /api/email-drafts/generate-ai`
- `POST /api/email-drafts/generate-ai/campaign/:campaignId`
- `GET /api/email-drafts/:id`
- `PATCH /api/email-drafts/:id`
- `GET /api/email-drafts/reply-drafts`
- `POST /api/email-drafts/:id/submit-for-approval`
- `POST /api/email-drafts/:id/approve`
- `POST /api/email-drafts/:id/reject`
- `POST /api/email-drafts/:id/send-reply`

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
- `GET /api/replies/:replyId/reply-drafts`

### No-Reply Monitoring

- `GET /api/no-reply-monitoring/status`
- `POST /api/no-reply-monitoring/check-sent-email/:sentEmailId`
- `POST /api/no-reply-monitoring/check-campaign/:campaignId`
- `GET /api/no-reply-monitoring/campaigns/:campaignId/no-replies`
- `GET /api/no-reply-monitoring/sent-emails/:sentEmailId/no-reply-status`

### Analytics

- `GET /api/analytics/overview`
- `GET /api/analytics/campaigns`
- `GET /api/analytics/senders`

### Automation

- `GET /api/automation/status`
- `POST /api/automation/run-now`

### Audit Logs

- `GET /api/audit-logs`

### Notifications

- `GET /api/notifications`
- `GET /api/notifications/summary`
- `GET /api/notifications/:id`
- `POST /api/notifications`
- `POST /api/notifications/generate/campaign/:campaignId`
- `POST /api/notifications/:id/mark-read`
- `POST /api/notifications/:id/resolve`
- `POST /api/notifications/:id/archive`
- `GET /api/campaigns/:campaignId/notifications`
- `WebSocket /api/notifications/realtime`

## Phase 17 Scope

Phase 17 adds read-only dashboard and timeline visibility only:

- Global dashboard summary at `GET /api/dashboard/summary`
- Campaign dashboard summary at `GET /api/dashboard/campaigns/:campaignId/summary`
- Campaign activity feed at `GET /api/dashboard/campaigns/:campaignId/activity`
- Lead timeline at `GET /api/dashboard/leads/:leadId/timeline`
- Campaign-lead timeline at `GET /api/dashboard/campaign-leads/:campaignLeadId/timeline`
- Dashboard frontend summary cards, campaign overview, recent activity, notification summary, and pending actions
- Campaign detail dashboard summary, activity timeline, and campaign-lead timeline selector

Phase 17 is read-only visibility. It does not automate outreach, send emails, change Gmail OAuth token logic, schedule jobs, or generate AI content.

## Phase 18 Scope

Phase 18 polishes the existing frontend workflows and adds an end-to-end QA checklist:

- Dashboard readability, empty states, campaign navigation, pending actions, and activity presentation
- Campaign detail organization for dashboard summary, activity timeline, lead timeline, leads, drafts, sent emails, replies, no-replies, decisions, notifications, and follow-up review
- Clear mock-mode and manual-action messaging for draft, reply, no-reply, follow-up, and notification workflows
- Sidebar navigation fixes for existing workflow surfaces
- QA checklist at `docs/phase-18-e2e-qa.md`

Phase 18 does not automate sending, add cron/schedulers, change Gmail OAuth token logic, expose Gmail tokens, or generate AI content.

## Phase 19 Production Readiness

Phase 19 reviews deployment safety before real outreach use:

- Repository safety and `.gitignore` coverage for env files, uploads, logs, build output, and dependencies
- Environment variable documentation with placeholder-only examples
- Supabase migration order review
- Gmail OAuth safety notes
- Email sending safety notes
- Deployment and rollback checklist at `docs/phase-19-production-readiness.md`

### Required Environment Variables

Backend deployment variables:

- `PORT`
- `CLIENT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` for trusted migration/admin use
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_SCOPES`
- `EMAIL_SEND_MODE`
- `EMAIL_SEND_LIVE_APPROVED`
- `GHL_MODE`
- `GHL_PRIVATE_INTEGRATION_TOKEN`
- `GHL_LOCATION_ID`
- `GHL_WORKFLOW_ID`
- `GHL_API_BASE_URL`
- `AUTH_REQUIRED`
- `TOKEN_ENCRYPTION_KEY`
- `JSON_BODY_LIMIT`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `SENSITIVE_RATE_LIMIT_WINDOW_MS`
- `SENSITIVE_RATE_LIMIT_MAX_REQUESTS`
- `BACKGROUND_AUTOMATION_ENABLED`
- `BACKGROUND_AUTOMATION_RUN_ON_START`
- `BACKGROUND_AUTOMATION_INTERVAL_MS`
- `BACKGROUND_AUTOMATION_CAMPAIGN_BATCH_SIZE`
- `BACKGROUND_AUTOMATION_NO_REPLY_TIMEOUT_DAYS`
- `BACKGROUND_AUTOMATION_CREATE_FOLLOWUP_DRAFTS`
- `BACKGROUND_AUTOMATION_FOLLOWUP_DRAFT_BATCH_SIZE`

Frontend deployment variables:

- `VITE_API_BASE_URL`
- `VITE_AUTH_REQUIRED`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is backend-only. Never expose it to frontend code or browser builds. Frontend code should only use public client-safe values such as `VITE_API_BASE_URL`, `VITE_AUTH_REQUIRED`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

### Safe Email Mode

`EMAIL_SEND_MODE=mock` is the safe default. Real sending must be explicitly enabled only after business approval, deployment review, and a documented live-send test plan. Approving a draft does not automatically send an email.

### Gmail OAuth Safety

Gmail OAuth client secrets and token values must stay backend-only. API responses should expose account connection status only, not access or refresh tokens. The current token-storage implementation is marked as placeholder storage and should be replaced with production encryption/KMS before broad production use.

### Deployment Checklist

- Apply Supabase migrations in order from `001_initial_schema.sql` through `016_lead_search_scoring_import_history.sql`.
- Keep `EMAIL_SEND_MODE=mock` during staging and pre-production QA.
- Keep `EMAIL_SEND_LIVE_APPROVED=false` until written live-send approval.
- Set `AUTH_REQUIRED=true` in staging and test Admin, Manager, Operator, and Viewer users.
- Verify workspace membership backfill and cross-workspace access denial.
- Verify RLS policies with real Supabase authenticated users.
- Confirm `/api/health` returns `status: ok`.
- Confirm dashboard, notifications, campaigns, and timeline endpoints respond.
- Confirm frontend build uses only client-safe environment variables.
- Confirm logs do not print secrets, Gmail OAuth tokens, or service role keys.

### Pre-Production QA Checklist

- Run backend import/syntax checks.
- Run frontend lint and build.
- Run `git diff --check`.
- Smoke test Dashboard, Campaigns, Lead Uploads, Email Accounts, Notifications, and timeline views.
- Walk through draft approval, mock send, reply review, no-reply review, follow-up draft review, notifications, and dashboards with `EMAIL_SEND_MODE=mock`.
- Confirm no real email is sent during QA.

## Phase 20 Final Demo Preparation

Phase 20 adds demo and handoff documentation only:

- Final demo preparation guide at `docs/phase-20-final-demo-preparation.md`
- Step-by-step demo script at `docs/demo-script.md`
- Screenshot checklist at `docs/screenshot-checklist.md`
- Final project summary at `docs/final-project-summary.md`

The demo remains safe by default with `EMAIL_SEND_MODE=mock`. Phase 20 does not add product logic, change backend business logic, create migrations, send real emails, change Gmail OAuth token logic, add schedulers, or implement AI generation.

## Phase 21 Deployment Setup

Phase 21 adds staging deployment setup documentation only:

- Deployment setup guide at `docs/phase-21-deployment-setup.md`
- Staging environment checklist at `docs/staging-env-checklist.md`
- Deployment smoke-test guide at `docs/deployment-smoke-tests.md`

Staging remains mock-safe with `EMAIL_SEND_MODE=mock`. Phase 21 does not add product logic, change backend business logic, create migrations, enable real email sending, change Gmail OAuth token logic, add schedulers, or implement AI generation.

## Phase 22 Staging Deployment QA

Phase 22 adds staging deployment QA documentation only:

- Staging deployment QA checklist at `docs/phase-22-staging-deployment-qa.md`
- QA results template at `docs/staging-qa-results-template.md`
- Issue log template at `docs/staging-issue-log-template.md`

QA should run with `EMAIL_SEND_MODE=mock`. Phase 22 does not add product logic, change backend business logic, create migrations, enable real email sending, add mutating email scripts, change Gmail OAuth token logic, add schedulers, or implement AI generation.

## Phase 23 Production Deployment Planning

Phase 23 adds production deployment planning documentation only:

- Production deployment plan at `docs/phase-23-production-deployment-plan.md`
- Production environment checklist at `docs/production-env-checklist.md`
- Production release checklist at `docs/production-release-checklist.md`

Phase 23 does not add product logic, change backend business logic, create migrations, deploy anything, enable real email sending, add mutating email scripts, change Gmail OAuth token logic, add schedulers, or implement AI generation. `EMAIL_SEND_MODE` remains approval-gated and should stay `mock` until written production approval is recorded.

## Phase 24 Security Hardening and Access Control Planning

Phase 24 adds security hardening and access control planning documentation only:

- Security hardening and access control plan at `docs/phase-24-security-hardening-access-control-plan.md`
- Security role matrix at `docs/security-role-matrix.md`
- Security hardening checklist at `docs/security-hardening-checklist.md`

Phase 24 does not add product logic, implement authentication, implement roles, change backend business logic, create migrations, deploy anything, enable real email sending, add mutating email scripts, change Gmail OAuth token logic, add schedulers, or implement AI generation. `EMAIL_SEND_MODE` remains approval-gated and should stay `mock`.

## Phase 25 Auth and RBAC Implementation Planning

Phase 25 adds authentication and RBAC implementation planning documentation only:

- Auth and RBAC implementation plan at `docs/phase-25-auth-rbac-implementation-plan.md`
- Auth/RBAC roadmap at `docs/auth-rbac-roadmap.md`
- Auth/RBAC test plan at `docs/auth-rbac-test-plan.md`

Phase 25 does not implement authentication, implement RBAC, add product logic, change backend business logic, create migrations, deploy anything, enable real email sending, add mutating email scripts, change Gmail OAuth token logic, add schedulers, or implement AI generation. `EMAIL_SEND_MODE` remains approval-gated and should stay `mock`.

## Phase 26 Production/Security Foundation

Phase 26 implements the security and product foundations planned in phases 24 and 25:

- Auth/RBAC backend enforcement and frontend login shell
- Role-aware navigation and protected business routes
- Workspace ownership migrations and query scoping
- Staging RLS read policies for workspace members
- OAuth state persistence for Gmail callback safety
- Token encryption utility and token redaction from API responses
- Audit logging for protected actions
- Validation, rate limits, security headers, and body limits
- AI-style draft generation with human approval before send
- Lead search, filters, tags, scoring, dedupe, and import history
- Analytics, automation status/run-now APIs, and admin readiness UI
- Realtime in-app notification delivery

Phase 26 does not apply migrations, deploy production, enable live sending, or enable live GHL sync. Those remain separate staging/production steps.

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
backend/db/migrations/008_team_decision_fields.sql
backend/db/migrations/009_reply_draft_workflow_fields.sql
backend/db/migrations/010_no_reply_timeout_fields.sql
backend/db/migrations/011_followup_creation_fields.sql
backend/db/migrations/012_notification_system_fields.sql
backend/db/migrations/013_workspace_ownership_foundation.sql
backend/db/migrations/014_workspace_rls_policies.sql
backend/db/migrations/015_google_oauth_state_persistence.sql
backend/db/migrations/016_lead_search_scoring_import_history.sql
```

Apply these SQL migrations in a Supabase PostgreSQL project when you are ready to create or update the schema. Do not commit real `.env` files or secrets.

For staging, back up the database first, apply migrations in order, then test with `AUTH_REQUIRED=true`, real Supabase users, role memberships, and cross-workspace denial checks.

## CI Checks

The repository includes a GitHub Actions workflow that runs:

- Backend tests: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Whitespace checks: `git diff --check`

## Verify Phase 0

1. Start the backend with `npm run dev` from `backend/`.
2. Start the frontend with `npm run dev` from `frontend/`.
3. Open `http://localhost:5173`.
4. Confirm the dashboard loads and the backend connection status shows the health service as online.
5. Visit `http://localhost:5000/api/health` and confirm the JSON response.
