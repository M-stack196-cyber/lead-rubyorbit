# Auth and RBAC Roadmap

## Phase A: Design Approval

- Goal: Approve provider choice, role matrix, workspace model, and protected-route inventory.
- Files/areas likely affected: docs, architecture notes, API route inventory.
- Risks: incomplete permissions or missed sensitive routes.
- Test requirements: documentation review only.
- Approval required: business, technical, and security owners.

## Phase B: Database Schema/Migrations

- Goal: Add users/profiles, workspaces, memberships, role assignments, workspace ownership fields, and audit tables.
- Files/areas likely affected: `backend/db/migrations`, `backend/db/SCHEMA.md`, Supabase configuration.
- Risks: migration mistakes, existing data without workspace ownership, broken queries.
- Test requirements: migration rehearsal in staging, schema verification, rollback rehearsal.
- Approval required: technical and database owner.

## Phase C: Backend Auth Middleware

- Goal: Verify authenticated sessions/JWTs and attach user context to requests.
- Files/areas likely affected: backend middleware, route registration, environment config.
- Risks: invalid session handling, inconsistent `401` responses, accidental public access.
- Test requirements: authenticated, unauthenticated, expired-session, and malformed-token tests.
- Approval required: technical and security owner.

## Phase D: Permission Enforcement

- Goal: Enforce role permissions for protected actions.
- Files/areas likely affected: backend middleware, route modules, service entry points, permission constants.
- Risks: overblocking valid users, underblocking sensitive actions, duplicate permission logic.
- Test requirements: role-by-role endpoint tests, negative tests, live-send block tests.
- Approval required: technical, security, and business workflow owner.

## Phase E: Frontend Auth Screens

- Goal: Add login, logout, session loading, and access-denied experiences.
- Files/areas likely affected: frontend pages, routing, app shell, API client.
- Risks: confusing UX, session race conditions, unsafe token storage.
- Test requirements: login/logout flow, expired session, refresh, and access-denied checks.
- Approval required: product/demo owner and technical owner.

## Phase F: Route/Action Protection

- Goal: Hide or disable protected frontend actions and routes based on permissions.
- Files/areas likely affected: frontend routes, navigation, Campaigns, Lead Uploads, Email Accounts, Notifications, Dashboard.
- Risks: frontend state mismatch with backend permissions.
- Test requirements: role-based UI checks and backend-forbidden action checks.
- Approval required: product and security owner.

## Phase G: RLS Policies

- Goal: Enforce workspace/account isolation at the database layer.
- Files/areas likely affected: Supabase policies, migrations, backend queries, schema docs.
- Risks: data leakage, blocked service workflows, incorrect policy assumptions.
- Test requirements: cross-workspace denial tests, role tests, backend service-role tests.
- Approval required: database and security owner.

## Phase H: Audit Logging

- Goal: Capture security-relevant actions without logging secrets.
- Files/areas likely affected: backend middleware, services, audit tables, admin/audit docs.
- Risks: missing critical events, logging sensitive values, excessive log volume.
- Test requirements: audit event creation, redaction checks, failed-action logging tests.
- Approval required: security and compliance owner.

## Phase I: QA and Security Testing

- Goal: Validate auth, RBAC, workspace isolation, RLS, audit logs, and mock-safe sending.
- Files/areas likely affected: test suites, QA docs, staging env, manual QA templates.
- Risks: incomplete role coverage or missed regressions.
- Test requirements: full auth/RBAC test plan, regression tests, staging smoke tests.
- Approval required: QA, technical, and security owner.

## Phase J: Release Approval

- Goal: Approve release of auth/RBAC implementation after QA and security review.
- Files/areas likely affected: release docs, deployment docs, README, production checklist.
- Risks: launching with unresolved blockers or unclear rollback plan.
- Test requirements: final staging verification, rollback plan, release checklist.
- Approval required: business, technical, security, and compliance owners.
