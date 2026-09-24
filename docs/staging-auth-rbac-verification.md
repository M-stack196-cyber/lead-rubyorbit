# Staging Auth/RBAC/Workspace Verification

Use this checklist after applying migrations `001` through `016` to a staging Supabase project. Keep `EMAIL_SEND_MODE=mock`, `EMAIL_SEND_LIVE_APPROVED=false`, and `GHL_MODE=mock`.

## Migration Checks

- Back up the staging database before applying migrations.
- Apply migrations in order from `001_initial_schema.sql` to `016_lead_search_scoring_import_history.sql`.
- Confirm the default workspace exists.
- Confirm existing rows have `workspace_id`.
- Confirm `team_members` are mapped to Supabase Auth users by email or `auth_user_id`.
- Confirm `workspace_memberships` exist for Admin, Manager, Operator, and Viewer users.
- Confirm RLS is enabled on workspace-owned tables.

## Auth Checks

- Unauthenticated protected API requests return `401`.
- Disabled or unmapped authenticated users return `403`.
- Expired frontend sessions clear local auth state and show the login page.
- The frontend shows the current user, role, and workspace in the sidebar.

## Role Checks

- Admin can manage Gmail, email accounts, audit logs, automation, and workflow settings.
- Manager can manage campaigns, approvals, decisions, notifications, and automation.
- Operator can import leads, write drafts, check replies/no-replies, and work decisions.
- Viewer can read analytics only and cannot perform mutating actions.
- Non-admin users do not see admin-only sidebar items.

## Workspace Isolation Checks

- User A cannot read User B workspace campaigns, leads, drafts, sent emails, replies, notifications, or audit logs.
- Cross-workspace IDs in route params return `404` or `403`.
- Direct Supabase authenticated reads obey workspace RLS policies.
- Backend service-role writes remain protected by API auth/RBAC.

## Workflow Checks

- Lead upload preview and confirm work in staging.
- Campaign creation and lead attachment are workspace-scoped.
- AI-style draft generation creates `pending_approval` drafts and never sends.
- Draft approval does not send email.
- Mock send creates mock sent-email records only.
- Reply checks require connected Gmail readonly scope.
- No-reply checks create review state and do not send follow-ups.
- Automation dry run checks replies/no-replies and creates follow-up drafts only.
- Realtime notification WebSocket refreshes the notification queue.

## Audit Checks

- OAuth connect/disconnect attempts are audited.
- Draft approval/rejection is audited.
- Send attempts are audited.
- Notification actions are audited.
- Automation run-now is audited.
- Permission denials write `permission.denied` audit entries.
- Audit metadata does not include secrets, OAuth tokens, cookies, or authorization headers.
