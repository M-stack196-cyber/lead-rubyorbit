import assert from 'node:assert/strict'
import fs from 'node:fs'
import { beforeEach, test } from 'node:test'

import { getHealth } from '../src/controllers/healthController.js'
import { env } from '../src/config/env.js'
import { getGmailStatusController } from '../src/modules/gmail/gmail.controller.js'
import {
  createGoogleOAuthState,
  hashGoogleOAuthState,
} from '../src/modules/gmail/gmail.oauthClient.js'
import { getEmailSendingStatus } from '../src/modules/emailSending/emailSending.service.js'
import { requireAuth, requireRole } from '../src/middleware/auth.js'
import { hasPermission, permissions, requirePermission } from '../src/middleware/permissions.js'
import { clearRateLimitBuckets, rateLimit } from '../src/middleware/rateLimit.js'
import { securityHeaders } from '../src/middleware/securityHeaders.js'
import { validateBody } from '../src/middleware/validate.js'
import { decryptSecret, encryptSecret, isEncryptedSecret } from '../src/utils/secretCrypto.js'
import {
  defaultWorkspaceId,
  getCurrentWorkspaceId,
  resolveWorkspace,
} from '../src/middleware/workspace.js'

beforeEach(() => {
  env.auth.required = true
  env.security.tokenEncryptionKey = '12345678901234567890123456789012'
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  clearRateLimitBuckets()
})

function createRequest(headers = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()] || ''
    },
  }
}

function createJsonResponse() {
  return {
    payload: null,
    headers: {},
    json(payload) {
      this.payload = payload
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
  }
}

function runMiddleware(middleware, req = createRequest(), res = {}) {
  return new Promise((resolve) => {
    middleware(req, res, (error) => resolve(error || null))
  })
}

test('health controller stays public', () => {
  const res = createJsonResponse()

  getHealth({}, res)

  assert.equal(res.payload.status, 'ok')
  assert.equal(res.payload.service, 'lead-rubyorbit-backend')
})

test('gmail status controller returns sanitized status without tokens', async () => {
  const res = createJsonResponse()

  await getGmailStatusController({}, res, (error) => {
    throw error
  })

  assert.equal(res.payload.message, 'Gmail OAuth status fetched successfully.')
  assert.equal(typeof res.payload.data.configured, 'boolean')
  assert.equal('accessToken' in res.payload.data, false)
  assert.equal('refreshToken' in res.payload.data, false)
})

test('google oauth state is opaque and hashable for server-side persistence', () => {
  const { state } = createGoogleOAuthState({
    emailAccountId: 'email-account-1',
    workspaceId: 'workspace-1',
    teamMemberId: 'team-member-1',
  })

  assert.equal(state.includes('email-account-1'), false)
  assert.equal(hashGoogleOAuthState(state).length, 64)
  assert.equal(hashGoogleOAuthState(state), hashGoogleOAuthState(state))
  assert.notEqual(hashGoogleOAuthState(state), state)
})

test('google oauth state carries expiry for persisted callback validation', () => {
  const { record } = createGoogleOAuthState({
    emailAccountId: 'email-account-1',
    workspaceId: 'workspace-1',
    teamMemberId: 'team-member-1',
    ttlMs: -1,
  })

  assert.equal(record.expiresAt < Date.now(), true)
})

test('requireAuth rejects missing bearer token when auth is required', async () => {
  const error = await runMiddleware(requireAuth)

  assert.equal(error.statusCode, 401)
  assert.equal(error.message, 'Authentication token is required.')
})

test('requireAuth allows requests through in local demo mode', async () => {
  env.auth.required = false

  const error = await runMiddleware(requireAuth)

  assert.equal(error, null)
})

test('requireRole allows an approved role', async () => {
  const req = {
    auth: {
      role: 'admin',
    },
  }

  const error = await runMiddleware(requireRole(['admin', 'manager']), req)

  assert.equal(error, null)
})

test('requireRole rejects a disallowed role', async () => {
  const req = {
    auth: {
      role: 'viewer',
    },
  }

  const error = await runMiddleware(requireRole(['admin', 'manager']), req)

  assert.equal(error.statusCode, 403)
  assert.equal(error.message, 'You do not have permission to perform this action.')
})

test('role permissions keep viewer read-only', () => {
  assert.equal(hasPermission('admin', permissions.GMAIL_MANAGE), true)
  assert.equal(hasPermission('admin', permissions.AUDIT_LOG_READ), true)
  assert.equal(hasPermission('manager', permissions.CAMPAIGN_WRITE), true)
  assert.equal(hasPermission('manager', permissions.AUDIT_LOG_READ), false)
  assert.equal(hasPermission('operator', permissions.LEAD_IMPORT), true)
  assert.equal(hasPermission('viewer', permissions.CAMPAIGN_WRITE), false)
})

test('requirePermission allows local demo mode without an authenticated role', async () => {
  env.auth.required = false

  const error = await runMiddleware(requirePermission(permissions.CAMPAIGN_WRITE))

  assert.equal(error, null)
})

test('requirePermission rejects a role without permission', async () => {
  const req = {
    auth: {
      role: 'viewer',
    },
  }

  const error = await runMiddleware(requirePermission(permissions.CAMPAIGN_WRITE), req)

  assert.equal(error.statusCode, 403)
  assert.equal(error.message, 'You do not have permission to perform this action.')
})

test('securityHeaders sets baseline browser protections', async () => {
  const res = createJsonResponse()
  const error = await runMiddleware(securityHeaders, {}, res)

  assert.equal(error, null)
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(res.headers['X-Frame-Options'], 'DENY')
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer')
})

test('rateLimit rejects requests after the configured limit', async () => {
  const limiter = rateLimit({ name: 'test', windowMs: 60_000, maxRequests: 1 })
  const req = createRequest()
  const res = createJsonResponse()

  const firstError = await runMiddleware(limiter, req, res)
  const secondError = await runMiddleware(limiter, req, res)

  assert.equal(firstError, null)
  assert.equal(secondError.statusCode, 429)
  assert.equal(secondError.message, 'Too many requests. Please try again later.')
  assert.equal(res.headers['Retry-After'], '60')
})

test('live email sending requires explicit approval flag beyond EMAIL_SEND_MODE', () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = false

  const blockedStatus = getEmailSendingStatus()
  assert.equal(blockedStatus.mode, 'mock')
  assert.equal(blockedStatus.requestedMode, 'live')
  assert.equal(blockedStatus.realSendingEnabled, false)

  env.emailSend.liveApproved = true
  const approvedStatus = getEmailSendingStatus()
  assert.equal(approvedStatus.mode, 'live')
  assert.equal(approvedStatus.realSendingEnabled, true)
})

test('validateBody rejects malformed write payloads before services run', async () => {
  const middleware = validateBody({
    name: { type: 'string', required: true, minLength: 1 },
    leadIds: { type: 'array', required: true, minItems: 1, itemType: 'string' },
  })
  const req = {
    body: {
      name: '',
      leadIds: [],
    },
  }

  const error = await runMiddleware(middleware, req)

  assert.equal(error.statusCode, 400)
  assert.equal(error.message, 'Request validation failed.')
  assert.equal(error.details.includes('name is required.'), true)
  assert.equal(error.details.includes('leadIds must include at least 1 item(s).'), true)
})

test('workspace RLS migration enables RLS and avoids broad FOR ALL policies', () => {
  const migration = fs.readFileSync(
    new URL('../db/migrations/014_workspace_rls_policies.sql', import.meta.url),
    'utf8',
  )
  const workspaceTables = [
    'lead_uploads',
    'leads',
    'campaigns',
    'campaign_leads',
    'email_accounts',
    'email_drafts',
    'sent_emails',
    'replies',
    'followups',
    'workflow_settings',
    'team_decisions',
    'notifications',
    'audit_logs',
  ]

  for (const table of workspaceTables) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`),
      `${table} must explicitly enable RLS`,
    )
    assert.match(
      migration,
      new RegExp(`create policy ${table}_workspace_member_select[\\s\\S]*?for select[\\s\\S]*?using \\(public\\.workspace_member_can_access\\(workspace_id\\)\\);`),
      `${table} must use workspace-scoped select policy`,
    )
  }

  assert.equal(/create policy[\s\S]*?for all/i.test(migration), false)
  assert.match(migration, /Mutations are routed through the backend service role plus API authorization\/RBAC\./)
})

test('workspace foundation migration keeps required workspace indexes', () => {
  const migration = fs.readFileSync(
    new URL('../db/migrations/013_workspace_ownership_foundation.sql', import.meta.url),
    'utf8',
  )
  const indexedTables = [
    'followups',
    'workflow_settings',
    'team_decisions',
    'notifications',
    'audit_logs',
  ]

  for (const table of indexedTables) {
    assert.match(
      migration,
      new RegExp(`create index if not exists idx_${table}_workspace_id\\s+on public\\.${table}\\(workspace_id\\);`),
      `${table} workspace_id index must exist`,
    )
  }
})

test('google oauth state migration persists one-time server-side state with RLS', () => {
  const migration = fs.readFileSync(
    new URL('../db/migrations/015_google_oauth_state_persistence.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /create table if not exists public\.google_oauth_states/)
  assert.match(migration, /state_hash text not null unique/)
  assert.match(migration, /workspace_id uuid not null references public\.workspaces\(id\) on delete cascade/)
  assert.match(migration, /email_account_id uuid not null references public\.email_accounts\(id\) on delete cascade/)
  assert.match(migration, /team_member_id uuid not null references public\.team_members\(id\) on delete cascade/)
  assert.match(migration, /expires_at timestamptz not null/)
  assert.match(migration, /consumed_at timestamptz/)
  assert.match(migration, /alter table public\.google_oauth_states enable row level security;/)
  assert.equal(/create policy[\s\S]*google_oauth_states/i.test(migration), false)
})

test('lead search migration adds scoring tags dedupe and import history fields', () => {
  const migration = fs.readFileSync(
    new URL('../db/migrations/016_lead_search_scoring_import_history.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /add column if not exists tags text\[\] not null default '\{\}'/)
  assert.match(migration, /add column if not exists score integer not null default 0 check \(score between 0 and 100\)/)
  assert.match(migration, /add column if not exists normalized_email text/)
  assert.match(migration, /add column if not exists dedupe_key text/)
  assert.match(migration, /add column if not exists duplicate_of_lead_id uuid references public\.leads\(id\)/)
  assert.match(migration, /create index if not exists idx_leads_workspace_tags\s+on public\.leads using gin\(tags\);/)
  assert.match(migration, /create index if not exists idx_leads_workspace_dedupe_key\s+on public\.leads\(workspace_id, dedupe_key\);/)
  assert.match(migration, /alter table public\.lead_uploads[\s\S]*add column if not exists imported_rows integer not null default 0/)
  assert.match(migration, /add column if not exists skipped_rows integer not null default 0/)
  assert.match(migration, /add column if not exists confirmed_at timestamptz/)
})

test('secret crypto encrypts and decrypts OAuth token values', () => {
  const encrypted = encryptSecret('gmail-refresh-token')

  assert.equal(isEncryptedSecret(encrypted), true)
  assert.notEqual(encrypted, 'gmail-refresh-token')
  assert.equal(decryptSecret(encrypted), 'gmail-refresh-token')
})

test('secret crypto can read legacy plaintext token values', () => {
  assert.equal(decryptSecret('legacy-token-value'), 'legacy-token-value')
})

test('resolveWorkspace sets the default workspace in local demo mode', async () => {
  env.auth.required = false
  const req = createRequest()

  const error = await runMiddleware(resolveWorkspace, req)

  assert.equal(error, null)
  assert.equal(req.workspace.id, defaultWorkspaceId)
  assert.equal(getCurrentWorkspaceId(), defaultWorkspaceId)
})
