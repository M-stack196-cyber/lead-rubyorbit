# Staging Role User Verification

Phase 9 requires real Supabase Auth users linked to `team_members.auth_user_id`.

## Current Staging State

- `team_members`: 0
- `workspace_memberships`: 0
- linked Auth users: 0
- Admin/Manager/Operator/Viewer memberships: 0 each

## Required Setup

1. Create one Supabase Auth user for each role:
   - Admin
   - Manager
   - Operator
   - Viewer
2. In LeadRubyOrbit, open Team Members and create/link each user:
   - email
   - `auth_user_id`
   - role
   - active status
3. Verify each user can log in and only see permitted navigation/actions.
4. Verify forbidden actions return `403` and create `permission.denied` audit logs.

You can create/link the four users with the backend helper script:

```bash
cd backend
STAGING_ADMIN_EMAIL=admin@example.com STAGING_ADMIN_PASSWORD='change-me' \
STAGING_MANAGER_EMAIL=manager@example.com STAGING_MANAGER_PASSWORD='change-me' \
STAGING_OPERATOR_EMAIL=operator@example.com STAGING_OPERATOR_PASSWORD='change-me' \
STAGING_VIEWER_EMAIL=viewer@example.com STAGING_VIEWER_PASSWORD='change-me' \
npm run staging:seed-role-users
```

The script requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend environment.
It confirms Auth users, creates/updates `team_members`, and upserts `workspace_memberships`
for the default workspace unless `STAGING_WORKSPACE_ID` is set.

## Verification Query

```sql
select
  wm.role,
  wm.status as membership_status,
  tm.email,
  tm.status as member_status,
  tm.auth_user_id
from public.workspace_memberships wm
join public.team_members tm on tm.id = wm.team_member_id
order by wm.role, tm.email;
```

For repeatable evidence, run the read-only SQL in
`docs/staging-role-user-verification.sql`. It returns a pass/missing status for
Admin, Manager, Operator, and Viewer.

You can also run:

```bash
cd backend
npm run staging:verify-role-users
```

To verify real Supabase sign-in plus backend RBAC locally against staging Supabase:

```bash
cd backend
npm run staging:smoke-role-users
```

Use the same `STAGING_*_EMAIL` and `STAGING_*_PASSWORD` environment variables from
the seed command. The smoke test forces `AUTH_REQUIRED=true`, signs in each role,
checks `/api/auth/me`, confirms Admin can access `/api/team-members`, and confirms
Viewer receives `403` for that admin-only route.

## Role Smoke Tests

- Admin: can open Team Members, Workflow Settings, Audit Logs, and create/update a team member.
- Manager: can manage campaigns, drafts, email accounts, automation settings, and approvals; cannot manage team members.
- Operator: can import leads, create drafts, run reply/no-reply checks, and manage follow-ups/decisions; cannot manage email accounts or workflow settings.
- Viewer: can open dashboard/analytics views only; mutating API calls must return `403`.

## Audit Evidence

After testing denied actions, confirm permission-denial audit rows exist:

```sql
select action, entity_type, entity_id, status_code, created_at
from public.audit_logs
where action = 'permission.denied'
order by created_at desc
limit 20;
```
