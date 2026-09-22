# Phase 25 Auth and RBAC Implementation Plan

## Phase Goal

Define the implementation roadmap for authentication, roles, permissions, route protection, workspace isolation, and Supabase RLS before coding begins.

## Recommended Auth Approach

Use a managed authentication provider with JWT-based sessions and server-side verification. Keep authorization decisions in the backend, with frontend checks used only for navigation and usability.

## Auth Provider Options

### Supabase Auth

- Pros: native fit with Supabase PostgreSQL, JWT support, user management, and RLS integration.
- Cons: requires careful planning for service-role backend operations and workspace claims.

### External Provider

- Pros: can use established enterprise identity providers such as Google Workspace, Auth0, or Clerk.
- Cons: adds another vendor and requires custom mapping into Supabase workspace/role records.

### Custom JWT Approach

- Pros: maximum control over auth behavior.
- Cons: highest implementation and security burden; not recommended unless there is a strong business requirement.

## Recommended Choice and Reason

Supabase Auth is the recommended starting point because the project already uses Supabase PostgreSQL and future RLS policies can align naturally with authenticated user context. If enterprise SSO becomes a hard requirement, an external provider can be evaluated later.

## User Model Plan

- Store auth identity in the auth provider.
- Add application user profile records for display name, email, status, and timestamps.
- Link each user profile to one or more workspaces/accounts.
- Store role assignments separately from auth identity.
- Avoid storing passwords in application tables.

## Workspace/Account Model Plan

- Add a workspace/account entity to scope business data.
- Add workspace/account membership records for users.
- Associate campaigns, leads, uploads, drafts, email accounts, replies, decisions, notifications, and audit logs with workspace/account context.
- Require workspace context for all protected business routes.

## Role Model Plan

- Start with Admin, Manager, Operator, and Viewer.
- Allow one role per user per workspace initially.
- Keep roles data-driven enough for future expansion, but avoid overbuilding custom policy UI in the first implementation.
- Restrict Admin assignment to approved bootstrap or existing Admin flows.

## Permission Model Plan

- Define named permissions in code.
- Map roles to permissions centrally.
- Require backend permission checks before business logic runs.
- Keep live sending as a separate Admin-only, approval-gated permission.
- Treat frontend permission checks as non-authoritative.

## Backend Middleware Plan

- Add authentication middleware to verify JWT/session.
- Add workspace context middleware to resolve membership.
- Add permission middleware for protected actions.
- Add consistent `401` unauthenticated and `403` forbidden responses.
- Apply middleware incrementally by route group.

## Frontend Route Protection Plan

- Add login/logout screens.
- Store session state using the auth provider client.
- Protect app routes behind authenticated session checks.
- Hide or disable actions unavailable to the current role.
- Show access-denied states for forbidden routes or actions.

## API Protection Rollout Plan

- Start with read-only endpoints and health-route exceptions.
- Protect mutating endpoints next.
- Add stricter checks around Gmail OAuth, email accounts, approvals, send endpoints, settings, imports, and team decisions.
- Verify every route has an explicit auth decision: public, authenticated, or permission-gated.

## Supabase RLS Rollout Plan

- Plan workspace/account columns before enabling RLS.
- Add policies for workspace-scoped reads/writes.
- Test policies with Admin, Manager, Operator, Viewer, and cross-workspace users.
- Keep service role key backend-only.
- Avoid enabling RLS broadly until backend queries are updated and tested.

## Migration Planning Notes

- Future implementation will likely require migrations for users/profiles, workspaces, memberships, roles, permissions, workspace IDs, and audit logs.
- Migration design must be reviewed before coding.
- Existing data needs a default workspace/account assignment plan.
- Phase 25 does not create migrations.

## Session Handling Plan

- Use secure sessions/JWT verification.
- Support logout and session expiration.
- Handle expired sessions with frontend redirect to login.
- Avoid storing tokens in unsafe browser storage if provider offers a safer pattern.
- Refresh sessions according to provider guidance.

## Login/Logout UX Plan

- Add a simple login page.
- Show clear errors for failed login.
- Add logout from the app shell.
- Preserve intended route after login when safe.
- Show current user identity and role in account/settings UI.

## Invitation/User Onboarding Plan

- Admin invites users by email.
- Invited users join a workspace/account with an assigned role.
- Invitation acceptance creates or links the auth identity to membership.
- Expired invitations can be resent by Admin.
- Invitations should be audited.

## Admin User Bootstrap Plan

- Use a one-time approved bootstrap method for the first Admin.
- Avoid hardcoded production admin credentials.
- Record bootstrap steps in deployment notes.
- Disable or remove bootstrap path after first Admin is created.

## Gmail OAuth Ownership Plan

- Gmail accounts belong to a workspace/account.
- Only Admin can connect or disconnect Gmail accounts.
- Managers, Operators, and Viewers may view status according to permissions.
- OAuth callback must validate that the connecting user has access to the target email account/workspace.

## Email Account Access Rules

- Admin can create, edit, enable, disable, archive, and connect Gmail accounts.
- Manager can view email account status.
- Operator can view email account status needed for workflow context.
- Viewer can view safe status only.
- No role should receive secret/token values in API responses.

## Live Sending Protection Rules

- Keep `EMAIL_SEND_MODE=mock` until written approval.
- Require Admin role for any future live-send action.
- Require environment-level live mode plus application-level permission.
- Add explicit confirmation UI before live send in a future implementation.
- Audit every live-send attempt, success, failure, and block.

## Audit Logging Requirements

- Log authentication events, role changes, workspace changes, invitations, imports, approvals, sends, Gmail OAuth actions, settings changes, and permission denials.
- Include actor, workspace/account, action, target resource, result, timestamp, and request ID.
- Never log passwords, tokens, service role keys, OAuth secrets, or database URLs.

## Testing Strategy

- Add unit tests for permission mapping.
- Add backend tests for auth middleware and protected endpoints.
- Add frontend tests for route and action protection.
- Add RLS tests for workspace isolation.
- Add regression tests to confirm mock sending remains safe.
- Add negative tests for unauthenticated, forbidden, and cross-workspace requests.

## Rollout Phases

- Phase A: design approval.
- Phase B: database schema/migrations.
- Phase C: backend auth middleware.
- Phase D: permission enforcement.
- Phase E: frontend auth screens.
- Phase F: route/action protection.
- Phase G: RLS policies.
- Phase H: audit logging.
- Phase I: QA and security testing.
- Phase J: release approval.

## Backward Compatibility Notes

- Existing demo/staging data needs mapping into a default workspace.
- Existing public API consumers, if any, will need authentication.
- Health endpoint can remain public if it stays non-sensitive.
- Mock-mode workflows should continue to function for authorized users.
- Existing Gmail token logic should not be changed until token encryption work is approved.

## Risks and Mitigations

- Risk: blocking existing workflows with incomplete permissions. Mitigation: staged rollout and route inventory.
- Risk: cross-workspace data leakage. Mitigation: backend scoping and RLS tests.
- Risk: accidental live-send access. Mitigation: Admin-only permission plus environment approval gate.
- Risk: token exposure. Mitigation: response filtering, log redaction, and encryption plan.
- Risk: migration mistakes. Mitigation: staging migration rehearsals and rollback plan.

## Acceptance Criteria Before Implementation

- Auth provider choice approved.
- Role matrix approved.
- Workspace/account model approved.
- Permission list approved.
- Route protection inventory completed.
- Migration plan reviewed.
- RLS rollout plan reviewed.
- Test plan approved.
- Live-send gating rules approved.

## What Should Remain Blocked

- Implementing authentication before design approval.
- Implementing RBAC before role/permission approval.
- Enabling live sending.
- Adding cron, scheduler, automatic sending, or AI generation.
- Exposing Gmail OAuth tokens.
- Changing Gmail OAuth token logic outside an approved security implementation phase.
