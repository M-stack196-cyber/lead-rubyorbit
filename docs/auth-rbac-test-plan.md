# Auth and RBAC Test Plan

## Auth Tests

- User can log in with valid credentials.
- User cannot log in with invalid credentials.
- User can log out.
- Expired session redirects to login.
- Protected API requests without a valid session return `401`.
- Public health check remains non-sensitive.

## Role Permission Tests

- Admin can access all approved admin actions.
- Manager can approve/reject drafts but cannot manage settings or connect Gmail.
- Operator can create/edit workflow records but cannot approve drafts or live send.
- Viewer can read allowed views but cannot mutate workflow data.
- Live send remains Admin-only and approval-gated.

## API Authorization Tests

- Protected routes reject unauthenticated requests.
- Protected routes reject authenticated users without required permission.
- Mutating endpoints require explicit permissions.
- Gmail OAuth endpoints require Admin permission.
- Settings endpoints require Admin permission.
- Permission errors use consistent `403` responses.

## Frontend Route Protection Tests

- Unauthenticated users are redirected to login.
- Authenticated users can access allowed pages.
- Forbidden pages show access-denied states.
- Navigation hides unavailable sections where appropriate.
- Buttons/actions unavailable to a role are hidden or disabled.

## Workspace Isolation Tests

- User can view records only in assigned workspace/account.
- User cannot fetch campaigns from another workspace.
- User cannot mutate leads from another workspace.
- User cannot view email accounts from another workspace.
- Timeline and notification queries stay workspace-scoped.

## Supabase RLS Tests

- RLS policies allow expected workspace-scoped reads.
- RLS policies block cross-workspace reads.
- RLS policies block cross-workspace writes.
- Backend service-role operations remain controlled and backend-only.
- RLS test users cover Admin, Manager, Operator, and Viewer.

## Gmail OAuth Access Tests

- Admin can start Gmail connect flow for an allowed workspace account.
- Non-Admin users cannot connect or disconnect Gmail.
- OAuth callback rejects invalid or unauthorized state.
- Gmail status response does not expose access or refresh tokens.
- Disconnect action is audited.

## Email Account Access Tests

- Admin can create/edit/enable/disable/archive email accounts.
- Manager can view safe email account status only.
- Operator can view safe email account status only.
- Viewer can view safe email account status only.
- No role receives secret fields in API responses.

## Mock Sending Permission Tests

- Authorized roles can perform mock send according to approved permissions.
- Unauthorized roles cannot trigger mock send.
- Mock send does not send real email.
- Mock send writes expected workflow history.
- Duplicate send protections still apply.

## Live Sending Block Tests

- Live sending is blocked when `EMAIL_SEND_MODE=mock`.
- Non-Admin users cannot live send even if live mode is configured.
- Admin live send remains blocked unless written approval gate is satisfied in the future design.
- Live-send attempts are audited.
- No automated path triggers live sending.

## Audit Logging Tests

- Login/logout events are logged.
- Permission-denied events are logged.
- Role changes are logged.
- Draft approval/rejection events are logged.
- Send attempts are logged.
- Gmail connect/disconnect events are logged.
- Audit logs never include secrets or tokens.

## Negative Tests

- Missing token returns `401`.
- Invalid token returns `401`.
- Valid user without workspace membership returns `403`.
- Valid user without permission returns `403`.
- Cross-workspace resource IDs return `403` or safe not-found behavior.
- Malformed inputs return validation errors without leaking internals.

## Regression Tests

- Dashboard still loads for allowed users.
- Campaign list/detail still load for allowed users.
- Lead upload/import still work for authorized roles.
- Draft workflow still works for authorized roles.
- Reply, no-reply, follow-up, notification, and timeline views still work.
- `EMAIL_SEND_MODE=mock` remains safe.
- Gmail OAuth tokens remain unexposed.
