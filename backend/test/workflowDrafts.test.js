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
