# Phase 24 Security Hardening and Access Control Plan

## Phase Goal

Plan security hardening and access control for LeadRubyOrbit before broad team use, production launch, or live outreach.

## Current Security Status

- Authentication is not implemented yet.
- Role-based access control is not implemented yet.
- Backend routes currently rely on deployment/network controls rather than app-level authorization.
- Gmail OAuth token handling exists but production-grade encryption/KMS remains a hardening item.
- `EMAIL_SEND_MODE=mock` remains the safe default and approval gate.
- No automatic sending, scheduler, cron, or AI generation is implemented.

## Security Risks Before Broad Production Use

- Unauthorized access to leads, campaigns, drafts, replies, and notifications.
- Unapproved users triggering mock or future live send actions.
- Inadequate workspace/account isolation if multiple teams use the same deployment.
- Exposure of Gmail tokens, service role keys, database URLs, or provider secrets.
- File upload abuse through oversized, malformed, or unsafe files.
- Insufficient audit history for approval, sending, OAuth, and settings actions.
- Missing rate limiting on sensitive endpoints.

## Authentication Plan

- Add an authentication provider or Supabase Auth in a future implementation phase.
- Require authenticated requests for all non-health APIs.
- Represent each user with a stable user ID, email, display name, role, and workspace/account membership.
- Add session expiration and logout behavior.
- Keep health checks public only if they expose no sensitive information.

## Role-Based Access Control Plan

Suggested roles:

- Admin: full system management, settings, Gmail connection, approvals, and approval-gated live sending.
- Manager: manage campaigns, approve/reject drafts, review decisions, and resolve notifications.
- Operator: upload/import leads, create/edit drafts, run manual checks, and prepare follow-ups.
- Viewer: read-only visibility into dashboards, campaigns, workflow status, and timelines.

## Permission Matrix

| Module | Admin | Manager | Operator | Viewer |
| --- | --- | --- | --- | --- |
| Dashboard | View | View | View | View |
| Lead Uploads | Full | Full | Full | View |
| Leads | Full | Full | Full | View |
| Campaigns | Full | Full | Create/edit | View |
| Email Drafts | Full | Approve/reject | Create/edit | View |
| Email Accounts | Full | View | View | View |
| Gmail OAuth | Connect/disconnect | View | View | View |
| Mock Sending | Allowed | Allowed | Allowed | View |
| Live Sending | Approval-gated | Blocked | Blocked | Blocked |
| Replies | Full | Full | Review | View |
| Team Decisions | Full | Full | Review/update | View |
| No-Reply Monitoring | Full | Full | Run/review | View |
| Follow-Up Drafts | Full | Approve/reject | Create/edit | View |
| Notifications | Full | Resolve | Review/update | View |
| Settings | Full | View | No access | No access |

Live sending should remain restricted to Admin only and require separate written approval before enablement.

## Workspace/Account Isolation Plan

- Add workspace/account membership to authenticated users.
- Require every business record to belong to a workspace/account.
- Filter every API query by workspace/account context.
- Prevent cross-workspace access to campaigns, leads, drafts, replies, email accounts, notifications, and timelines.
- Include workspace/account identifiers in audit logs.

## Supabase RLS Planning Notes

- Plan row-level security policies for all workspace-owned tables.
- Use workspace/account membership claims or server-side policies.
- Keep service role access backend-only.
- Avoid using service role keys from browser code.
- Validate that RLS policies do not block required backend workflows.

## Backend Authorization Middleware Plan

- Add authentication middleware before protected API routes.
- Add role/permission middleware for sensitive actions.
- Require explicit permission checks for approval, send, OAuth, settings, import, and decision endpoints.
- Return consistent `401` and `403` responses.
- Keep authorization checks centralized and testable.

## Frontend Route Protection Plan

- Redirect unauthenticated users to login.
- Hide or disable actions the current role cannot perform.
- Protect routes for settings, OAuth, sending, and admin-only views.
- Treat frontend checks as usability only; backend authorization remains authoritative.

## Gmail Token Security Plan

- Encrypt Gmail access and refresh tokens with production-grade encryption or KMS.
- Never return tokens in frontend/API responses.
- Redact tokens from logs and error reports.
- Restrict Gmail connect/disconnect to Admin.
- Audit Gmail connect, refresh, error, and disconnect events.

## Secret Handling Plan

- Store secrets only in hosting provider secret management.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, Gmail secrets, provider tokens, and private integration tokens backend-only.
- Rotate any exposed secret immediately.
- Do not include secrets in docs, screenshots, logs, issue reports, or frontend env.

## Audit Logging Plan

- Log security-relevant actions: login, logout, role changes, settings changes, lead imports, draft approvals, sends, OAuth changes, decisions, and notification resolutions.
- Include actor, workspace/account, target resource, action, result, timestamp, and request correlation ID.
- Avoid storing secret values in audit logs.
- Provide read-only audit access to Admin and approved compliance reviewers.

## Rate Limiting Plan

- Add rate limits for login, OAuth callbacks/connect attempts, file uploads, send endpoints, and bulk actions.
- Add request size limits for upload and JSON payload endpoints.
- Monitor repeated authorization failures.
- Keep limits strict around future live-send actions.

## File Upload Security Plan

- Validate file type and extension.
- Enforce upload size limits.
- Store uploads outside public web roots.
- Sanitize parsed content and reject unsafe rows.
- Avoid executing uploaded content.
- Log upload metadata without storing secrets.

## API Input Validation Plan

- Validate route params, query params, and request bodies.
- Reject unknown or unsafe enum values.
- Normalize email addresses and text fields.
- Add consistent error responses for validation failures.
- Keep validation before business logic and database writes.

## Production Logging Redaction Plan

- Redact `Authorization` headers, cookies, tokens, API keys, OAuth secrets, service role keys, database URLs, and provider credentials.
- Avoid logging full request bodies on sensitive endpoints.
- Review logs after deployment for accidental secret exposure.
- Include request IDs for troubleshooting without exposing sensitive data.

## Incident Response Plan

- Define incident severity levels.
- Identify business, technical, security, and compliance owners.
- Disable live sending immediately if outreach behavior is unsafe.
- Rotate secrets if exposure is suspected.
- Preserve relevant logs without exposing secrets.
- Document root cause, fix, and prevention steps.

## Security Acceptance Checklist

- Authentication is implemented and required for protected routes.
- Roles and permissions are enforced by the backend.
- Workspace/account isolation is validated.
- Supabase RLS policies are reviewed and tested.
- Gmail tokens are encrypted and never exposed.
- Secrets are backend-only and redacted from logs.
- File uploads have limits and validation.
- Rate limiting is active on sensitive endpoints.
- Audit logging captures key security actions.
- Live sending remains approval-gated.

## What Remains Blocked Before Implementation

- Final decision on authentication provider.
- Final role and permission approval.
- Workspace/account data model approval.
- Supabase RLS design and migration plan.
- Token encryption/KMS implementation plan.
- Audit logging schema and retention policy.
- Security test plan and acceptance criteria.
