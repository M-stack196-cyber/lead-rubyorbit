# LeadRubyOrbit Production Improvement Phases

This roadmap turns the project review into implementation phases. Work through these in order so security, data ownership, testing, and product features build on each other cleanly.

## Phase 1 - API Authentication Foundation

Goal: make every business API route capable of rejecting unauthenticated requests.

- Add backend auth middleware that verifies Supabase Auth bearer tokens.
- Keep `/api/health`, `/api/gmail/status`, and `/api/gmail/oauth/callback` public.
- Load the authenticated Supabase user into `req.auth`.
- Resolve the matching `team_members` row by email and require `status = active`.
- Add backend env flags so local demo mode can stay open while staging/production can require auth.
- Return `401` for missing/invalid tokens and `403` for disabled or unmapped team members.
- Add request tests for public route access, missing token rejection, invalid token rejection, and valid token acceptance.

## Phase 2 - Roles And Permission Gates

Goal: enforce Admin, Manager, Operator, and Viewer permissions in backend routes.

- Centralize role-to-permission mapping.
- Protect sensitive actions by permission:
  - Admin: Gmail OAuth connect/disconnect, live-send settings, team member management.
  - Manager: campaign creation, campaign edits, approvals, team decisions.
  - Operator: lead import, draft creation, mock sending, reply/follow-up review.
  - Viewer: read-only dashboard, timelines, notifications, campaigns, leads.
- Hide or disable frontend actions based on user role.
- Add forbidden-access tests for each role.

## Phase 3 - Workspace Ownership And Query Scoping

Goal: prevent cross-team data leaks.

- Add `workspaces` and `workspace_memberships`.
- Add `workspace_id` to campaigns, leads, uploads, drafts, email accounts, sent emails, replies, decisions, notifications, audit logs, and workflow settings.
- Backfill existing demo data into a default workspace.
- Require workspace context for every protected API request.
- Filter every backend query by workspace.
- Add cross-workspace denial tests.

## Phase 4 - Supabase RLS Policies

Goal: enforce workspace isolation at the database layer too.

- Keep RLS enabled on public tables.
- Add ownership-scoped policies using workspace membership predicates.
- Avoid `TO authenticated`-only policies because they authenticate without authorizing.
- Avoid user-editable metadata for authorization decisions.
- Verify policies using Supabase RLS tests or SQL test cases.
- Confirm new tables are exposed to the Data API only when intentionally needed.

## Phase 5 - Secret And Token Hardening

Goal: remove placeholder secret handling.

- Encrypt Gmail access tokens and refresh tokens with a production-grade encryption key or KMS.
- Add `TOKEN_ENCRYPTION_KEY` or selected KMS config to backend env.
- Never return token values from API responses.
- Redact credentials, authorization headers, cookies, and provider tokens from logs.
- Add token rotation/reconnect guidance.
- Add tests proving tokens are not returned in account, Gmail, or error responses.

## Phase 6 - Request Hardening And Abuse Protection

Goal: reduce operational and abuse risk.

- Add security headers.
- Add JSON body size limits.
- Add rate limits for:
  - auth/login/session endpoints,
  - uploads,
  - Gmail OAuth connect/callback,
  - send draft,
  - send campaign,
  - notification generation,
  - bulk actions.
- Keep upload size and file extension checks.
- Add MIME/content sniffing for uploads.
- Add safe error responses that do not expose stack traces in production.

## Phase 7 - Atomic Sending And Workflow Integrity

Goal: make sending and state changes concurrency-safe.

- Fix bulk send daily-limit handling with DB-side atomic increments or transaction/RPC.
- Prevent duplicate sends under concurrent requests.
- Update draft, sent email, account counter, and campaign lead status as one logical operation.
- Add daily counter reset rules.
- Add tests for duplicate-send prevention, limit exhaustion, and partial failure behavior.

## Phase 8 - Audit Logs

Goal: create traceability for sensitive actions.

- Log imports, campaign changes, approvals, rejections, sends, Gmail OAuth connect/disconnect, decisions, notification state changes, role changes, and permission denials.
- Include actor, workspace, entity type, entity id, action, result, timestamp, and request id.
- Never store secrets or full token values in audit metadata.
- Add an admin-facing audit log view.

## Phase 9 - Validation And Backend Test Harness

Goal: stop invalid data before it reaches services.

- Add a backend test runner with API tests.
- Add schema validation for request bodies, params, and query strings.
- Test all key controllers and service edge cases.
- Add scripts for `test`, `test:watch`, and CI-friendly checks.
- Add fixture factories for campaigns, leads, drafts, accounts, and team members.

## Phase 10 - Frontend Product Area Completion

Goal: make navigation match real product functionality.

- Add separate pages for Leads, Email Drafts, Replies, Follow-ups, Team Decisions, Workflow Settings, and Team Members.
- Replace routes that currently point back to `CampaignsPage`.
- Add protected frontend routes and login/logout screens.
- Add role-aware navigation and action visibility.
- Add better empty/loading/error states for every page.

## Phase 11 - AI Draft Generation

Goal: add controlled AI support without bypassing human approval.

- Generate primary outreach drafts from lead/campaign context.
- Generate reply drafts from incoming replies.
- Generate follow-up drafts from no-reply context.
- Require approval before any AI-generated message can be sent.
- Store prompt inputs, model metadata, and review state without storing unnecessary sensitive data.

## Phase 12 - Automation And Scheduling

Goal: reduce manual checking while keeping controls.

- Add scheduled reply monitoring.
- Add scheduled no-reply checks.
- Add automatic follow-up draft creation.
- Add pause/stop rules per lead and campaign.
- Add worker/job observability.
- Keep live sending approval-gated.

## Phase 13 - Lead Operations

Goal: make the lead database useful at scale.

- Add lead search, filters, tags, scoring, status changes, and dedupe against existing database leads.
- Add import history with preview, confirm, reprocess, and rollback options.
- Add lead notes and internal comments.
- Add timeline improvements per lead and campaign lead.

## Phase 14 - Campaign Templates And Analytics

Goal: improve repeatability and reporting.

- Add reusable campaign templates and outreach sequences.
- Add campaign performance analytics.
- Track send, reply, no-reply, follow-up, approval, and sender performance metrics.
- Add exports for campaign and lead reports.

## Phase 15 - Production Admin And Delivery Integrations

Goal: complete operational controls.

- Add admin panels for workspace settings, OAuth status, send limits, and live-send approval.
- Add real notification delivery through email, Slack, or another approved channel.
- Add production smoke tests.
- Add deployment checks for required env vars, auth mode, token encryption, and mock/live send mode.
