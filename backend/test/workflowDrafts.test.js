import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import { afterEach, test } from 'node:test'

import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import {
  createWorkflowDraft,
  deleteWorkflowDraft,
  listWorkflowDrafts,
  updateWorkflowDraft,
} from '../src/modules/workflowDrafts/workflowDrafts.service.js'
import { validateWorkflowSchemaPayload } from '../src/modules/workflowDrafts/workflowSchemaValidator.service.js'

afterEach(() => {
  env.auth.required = true
})

function createMockQuery(result = { data: [], error: null }) {
  const calls = []
  const query = {
    calls,
    delete() {
      calls.push(['delete'])
      return query
    },
    eq(field, value) {
      calls.push(['eq', field, value])
      return query
    },
    insert(values) {
      calls.push(['insert', values])
      return query
    },
    order(field, options) {
      calls.push(['order', field, options])
      return Promise.resolve(result)
    },
    select(columns) {
      calls.push(['select', columns])
      return query
    },
    single() {
      calls.push(['single'])
      return Promise.resolve(result)
    },
    update(values) {
      calls.push(['update', values])
      return query
    },
  }

  return query
}

function createMockSupabase(query) {
  return {
    from(table) {
      query.calls.push(['from', table])
      return query
    },
  }
}

function createWorkflowDraftRow(overrides = {}) {
  return {
    id: 'workflow-1',
    workspace_id: 'workspace-1',
    name: 'Workspace Draft',
    status: 'draft',
    mode: 'visual-only',
    nodes: [],
    edges: [],
    summary: {},
    validation_status: 'Warning',
    created_by: null,
    updated_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function requestApp(path, options = {}) {
  const app = createApp()
  const server = http.createServer(app)
  const originalError = console.error
  const originalLog = console.log

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    console.error = () => {}
    console.log = () => {}
    const address = server.address()
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options)
    const payload = await response.json().catch(() => ({}))

    return { response, payload }
  } finally {
    console.error = originalError
    console.log = originalLog
    await new Promise((resolve) => server.close(resolve))
  }
}

test('workflow draft create requires auth before workspace persistence', async () => {
  env.auth.required = true

  const { response, payload } = await requestApp('/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Blocked Draft',
      status: 'draft',
      mode: 'visual-only',
      nodes: [],
      edges: [],
    }),
  })

  assert.equal(response.status, 401)
  assert.equal(payload.message, 'Authentication token is required.')
})

test('workflow draft create rejects invalid payload before persistence', async () => {
  env.auth.required = false

  const { response, payload } = await requestApp('/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid Draft',
      status: 'draft',
      mode: 'visual-only',
      nodes: {},
      edges: [],
      unsupported: true,
    }),
  })

  assert.equal(response.status, 400)
  assert.equal(payload.message, 'Request validation failed.')
})

test('workflow draft list is scoped to the current workspace', async () => {
  const query = createMockQuery({ data: [createWorkflowDraftRow()], error: null })
  const supabase = createMockSupabase(query)

  const result = await listWorkflowDrafts({ supabase, workspaceId: 'workspace-1' })

  assert.equal(result.length, 1)
  assert.deepEqual(query.calls.find((call) => call[0] === 'eq'), ['eq', 'workspace_id', 'workspace-1'])
  assert.deepEqual(query.calls.find((call) => call[0] === 'order'), [
    'order',
    'updated_at',
    { ascending: false },
  ])
})


test('workflow draft list preserves saved compatibility summary metadata', async () => {
  const savedSummary = {
    schemaVersion: 'visual-workflow-v1',
    localCompatibilityStatus: 'Passed',
    backendCompatibilityStatus: 'Passed',
    backendValidatedAt: '2026-09-28T15:27:08.723Z',
    backendValidationSummary: {
      nodes: 2,
      edges: 1,
      triggers: 1,
      actions: 1,
      waits: 0,
      conditions: 0,
      mappedBlocks: 2,
      unmappedBlocks: 0,
    },
    executionEnabled: false,
    safety: 'visual-only',
    mode: 'visual-only',
  }
  const query = createMockQuery({
    data: [createWorkflowDraftRow({ summary: savedSummary })],
    error: null,
  })

  const result = await listWorkflowDrafts({
    supabase: createMockSupabase(query),
    workspaceId: 'workspace-1',
  })

  assert.deepEqual(result[0].summary, savedSummary)
  assert.equal(result[0].summary.backendCompatibilityStatus, 'Passed')
  assert.equal(result[0].summary.backendValidatedAt, '2026-09-28T15:27:08.723Z')
})

test('workflow draft update and delete use workspace ownership filters', async () => {
  const updateQuery = createMockQuery({ data: createWorkflowDraftRow(), error: null })
  const deleteQuery = createMockQuery({ data: createWorkflowDraftRow(), error: null })

  await updateWorkflowDraft('workflow-1', { name: 'Renamed Draft' }, {
    supabase: createMockSupabase(updateQuery),
    workspaceId: 'workspace-1',
  })
  await deleteWorkflowDraft('workflow-1', {
    supabase: createMockSupabase(deleteQuery),
    workspaceId: 'workspace-1',
  })

  assert.deepEqual(updateQuery.calls.filter((call) => call[0] === 'eq'), [
    ['eq', 'workspace_id', 'workspace-1'],
    ['eq', 'id', 'workflow-1'],
  ])
  assert.deepEqual(deleteQuery.calls.filter((call) => call[0] === 'eq'), [
    ['eq', 'workspace_id', 'workspace-1'],
    ['eq', 'id', 'workflow-1'],
  ])
})

test('workflow draft mode remains visual-only', async () => {
  const query = createMockQuery({ data: createWorkflowDraftRow(), error: null })

  await assert.rejects(
    createWorkflowDraft({
      name: 'Unsafe Mode',
      status: 'draft',
      mode: 'automation',
      nodes: [],
      edges: [],
    }, {
      supabase: createMockSupabase(query),
      workspaceId: 'workspace-1',
    }),
    /Workflow mode must be visual-only/,
  )

  await createWorkflowDraft({
    name: 'Safe Mode',
    status: 'draft',
    mode: 'visual-only',
    nodes: [],
    edges: [],
  }, {
    supabase: createMockSupabase(query),
    workspaceId: 'workspace-1',
  })

  const insertCall = query.calls.find((call) => call[0] === 'insert')
  assert.equal(insertCall[1].mode, 'visual-only')
})

test('workflow drafts migration creates workspace-scoped visual draft table with RLS', () => {
  const migration = fs.readFileSync(
    new URL('../db/migrations/022_workflow_drafts.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /create table if not exists public\.workflow_drafts/)
  assert.match(migration, /workspace_id uuid not null references public\.workspaces\(id\) on delete cascade/)
  assert.match(migration, /status text not null default 'draft' check \(status in \('draft'\)\)/)
  assert.match(migration, /mode text not null default 'visual-only' check \(mode in \('visual-only'\)\)/)
  assert.match(migration, /create index if not exists idx_workflow_drafts_workspace_id/)
  assert.match(migration, /create index if not exists idx_workflow_drafts_workspace_updated_at/)
  assert.match(migration, /create index if not exists idx_workflow_drafts_workspace_status/)
  assert.match(migration, /alter table public\.workflow_drafts enable row level security;/)
  assert.match(
    migration,
    /create policy workflow_drafts_workspace_member_select[\s\S]*?for select[\s\S]*?using \(public\.workspace_member_can_access\(workspace_id\)\);/,
  )
  assert.equal(/create policy[\s\S]*?for all/i.test(migration), false)
})

function createVisualWorkflowSchema(overrides = {}) {
  const nodes = overrides.nodes || [
    {
      id: 'trigger-1',
      type: 'trigger',
      category: 'Trigger',
      label: 'Lead Added to Campaign',
      typeKey: 'trigger.lead_added_to_campaign',
      module: 'campaigns',
      operation: 'attachedToCampaign',
      safety: 'visual-only',
      executionEnabled: false,
      settings: {},
    },
    {
      id: 'action-1',
      type: 'action',
      category: 'Action',
      label: 'Create AI Draft',
      typeKey: 'action.create_ai_draft',
      module: 'emailDrafts',
      operation: 'createDraft',
      safety: 'visual-only',
      executionEnabled: false,
      settings: {},
    },
  ]

  return {
    schemaVersion: 'visual-workflow-v1',
    workflowName: 'Validated Workflow',
    status: 'Draft',
    mode: 'visual-only',
    executionEnabled: false,
    safety: 'visual-only',
    nodes,
    edges: overrides.edges || [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1',
        label: '',
      },
    ],
    ...overrides,
  }
}

test('workflow schema validator returns Passed for a valid visual schema', () => {
  const report = validateWorkflowSchemaPayload(createVisualWorkflowSchema())

  assert.equal(report.status, 'Passed')
  assert.equal(report.summary.nodes, 2)
  assert.equal(report.summary.edges, 1)
  assert.equal(report.summary.triggers, 1)
  assert.equal(report.summary.actions, 1)
  assert.equal(report.summary.mappedBlocks, 2)
  assert.equal(report.summary.unmappedBlocks, 0)
})

test('workflow schema validator returns Error for executionEnabled true', () => {
  const schema = createVisualWorkflowSchema({ executionEnabled: true })
  schema.nodes[1] = { ...schema.nodes[1], executionEnabled: true }

  const report = validateWorkflowSchemaPayload(schema)

  assert.equal(report.status, 'Error')
  assert.equal(report.checks.some((check) => check.id === 'schema-execution-disabled' && check.status === 'Error'), true)
  assert.equal(report.checks.some((check) => check.id === 'node-execution-disabled' && check.status === 'Error'), true)
  assert.equal(report.checks.some((check) => check.id === 'no-execution-enabled-nodes' && check.status === 'Error'), true)
})

test('workflow schema validator returns Error for non visual-only safety', () => {
  const schema = createVisualWorkflowSchema({ safety: 'automation' })
  schema.nodes[0] = { ...schema.nodes[0], safety: 'automation' }

  const report = validateWorkflowSchemaPayload(schema)

  assert.equal(report.status, 'Error')
  assert.equal(report.checks.some((check) => check.id === 'schema-safety' && check.status === 'Error'), true)
  assert.equal(report.checks.some((check) => check.id === 'node-visual-only-safety' && check.status === 'Error'), true)
})

test('workflow schema validator returns Error for broken edge references', () => {
  const report = validateWorkflowSchemaPayload(createVisualWorkflowSchema({
    edges: [{ id: 'edge-broken', source: 'trigger-1', target: 'missing-node' }],
  }))

  assert.equal(report.status, 'Error')
  assert.equal(report.checks.some((check) => check.id === 'edge-node-references' && check.status === 'Error'), true)
})

test('workflow schema validator returns Warning for missing or unknown module operation mapping', () => {
  const schema = createVisualWorkflowSchema()
  schema.nodes[1] = {
    ...schema.nodes[1],
    module: 'unknown',
    operation: 'unknown',
  }

  const report = validateWorkflowSchemaPayload(schema)

  assert.equal(report.status, 'Warning')
  assert.equal(report.summary.mappedBlocks, 1)
  assert.equal(report.summary.unmappedBlocks, 1)
  assert.equal(report.checks.some((check) => check.id === 'known-module-operation' && check.status === 'Warning'), true)
})

test('workflow schema validation endpoint requires auth before validation', async () => {
  env.auth.required = true

  const { response, payload } = await requestApp('/api/workflows/schema/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createVisualWorkflowSchema()),
  })

  assert.equal(response.status, 401)
  assert.equal(payload.message, 'Authentication token is required.')
})

test('workflow schema validation endpoint validates visual schema without persistence', async () => {
  env.auth.required = false

  const { response, payload } = await requestApp('/api/workflows/schema/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema: createVisualWorkflowSchema() }),
  })

  assert.equal(response.status, 200)
  assert.equal(payload.message, 'Workflow schema validated successfully. No automation was executed.')
  assert.equal(payload.data.status, 'Passed')
  assert.equal(payload.data.summary.nodes, 2)
})

test('workflow schema validator does not import execution or email services', () => {
  const service = fs.readFileSync(
    new URL('../src/modules/workflowDrafts/workflowSchemaValidator.service.js', import.meta.url),
    'utf8',
  )

  assert.equal(/emailSending|gmail|smtp|automation\.scheduler|sendGmailMessage|sendSmtpMessage|sendMockEmail/.test(service), false)
})
