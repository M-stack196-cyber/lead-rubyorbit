import assert from 'node:assert/strict'
import http from 'node:http'
import { afterEach, test } from 'node:test'

import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import {
  resumeWorkflowExecution,
  runWorkflowExecution,
  startWorkflowExecution,
} from '../src/modules/workflowExecutions/workflowExecutions.service.js'

afterEach(() => {
  env.auth.required = true
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
})

function createWorkflowDraftRow(overrides = {}) {
  return {
    id: 'workflow-1',
    workspace_id: 'workspace-1',
    name: 'Execution Workflow',
    status: 'draft',
    mode: 'visual-only',
    nodes: [
      createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
      createNode('draft-1', 'action.create_ai_draft', 'Action'),
      createNode('wait-1', 'wait.wait_days', 'Wait', { duration: '2', unit: 'days' }),
    ],
    edges: [
      { id: 'edge-1', source: 'trigger-1', target: 'draft-1', label: '' },
      { id: 'edge-2', source: 'draft-1', target: 'wait-1', label: '' },
    ],
    summary: {},
    validation_status: 'Passed',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createNode(id, typeKey, category, settings = {}) {
  return {
    id,
    type: 'workflowBlock',
    data: {
      label: typeKey,
      category,
      typeKey,
      settings,
    },
  }
}

function createMockSupabase({ workflowDrafts = [createWorkflowDraftRow()] } = {}) {
  const tables = {
    workflow_drafts: [...workflowDrafts],
    workflow_executions: [],
    workflow_execution_steps: [],
  }
  const calls = []
  let sequence = 1

  function now() {
    return '2026-09-30T12:00:00.000Z'
  }

  function nextId(prefix) {
    sequence += 1
    return `${prefix}-${sequence}`
  }

  function createQuery(table) {
    const state = {
      filters: [],
      insertValues: null,
      updateValues: null,
    }
    const query = {
      eq(field, value) {
        state.filters.push([field, value])
        calls.push(['eq', table, field, value])
        return query
      },
      insert(values) {
        state.insertValues = values
        calls.push(['insert', table, values])
        return query
      },
      order(field, options) {
        calls.push(['order', table, field, options])
        return Promise.resolve(executeMany())
      },
      select(columns) {
        calls.push(['select', table, columns])
        return query
      },
      single() {
        calls.push(['single', table])
        return Promise.resolve(executeSingle())
      },
      update(values) {
        state.updateValues = values
        calls.push(['update', table, values])
        return query
      },
    }

    function matches(row) {
      return state.filters.every(([field, value]) => row[field] === value)
    }

    function defaultsForInsert(values) {
      if (table === 'workflow_executions') {
        return {
          id: nextId('execution'),
          status: 'running',
          current_node_id: null,
          started_at: now(),
          completed_at: null,
          error_message: null,
          context: {},
          created_at: now(),
          updated_at: now(),
          ...values,
        }
      }

      if (table === 'workflow_execution_steps') {
        return {
          id: nextId('step'),
          status: 'pending',
          input: {},
          output: {},
          error_message: null,
          started_at: now(),
          completed_at: null,
          created_at: now(),
          ...values,
        }
      }

      return { id: nextId('row'), created_at: now(), updated_at: now(), ...values }
    }

    function executeMany() {
      return {
        data: tables[table].filter(matches),
        error: null,
      }
    }

    function executeSingle() {
      if (state.insertValues) {
        const row = defaultsForInsert(state.insertValues)
        tables[table].push(row)
        return { data: row, error: null }
      }

      if (state.updateValues) {
        const row = tables[table].find(matches)
        if (!row) {
          return { data: null, error: { code: 'PGRST116', message: 'No rows found.' } }
        }

        Object.assign(row, state.updateValues, { updated_at: now() })
        return { data: row, error: null }
      }

      const row = tables[table].find(matches)
      if (!row) {
        return { data: null, error: { code: 'PGRST116', message: 'No rows found.' } }
      }

      return { data: row, error: null }
    }

    return query
  }

  return {
    calls,
    tables,
    from(table) {
      calls.push(['from', table])
      return createQuery(table)
    },
  }
}

async function startAndRun(supabase, payload = {}) {
  const execution = await startWorkflowExecution({
    workflowDraftId: 'workflow-1',
    context: {},
    ...payload,
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  return runWorkflowExecution({ executionId: execution.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })
}

async function resumeExecution(supabase, executionId, resumeContext = {}) {
  return resumeWorkflowExecution({
    executionId,
    context: resumeContext,
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })
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

test('workflow execution run requires auth', async () => {
  env.auth.required = true

  const { response, payload } = await requestApp('/api/workflows/workflow-1/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { replyReceived: false } }),
  })

  assert.equal(response.status, 401)
  assert.equal(payload.message, 'Authentication token is required.')
})

test('startWorkflowExecution creates a workspace-scoped execution', async () => {
  const supabase = createMockSupabase()

  const execution = await startWorkflowExecution({
    workflowDraftId: 'workflow-1',
    leadId: 'lead-1',
    campaignId: 'campaign-1',
    context: { replyReceived: false },
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(execution.status, 'running')
  assert.equal(execution.workflowDraftId, 'workflow-1')
  assert.equal(execution.leadId, 'lead-1')
  assert.equal(supabase.tables.workflow_executions.length, 1)
  assert.deepEqual(
    supabase.calls.filter((call) => call[0] === 'eq' && call[2] === 'workspace_id').map((call) => call[3]),
    ['workspace-1'],
  )
})

test('simple workflow completes supported steps', async () => {
  const supabase = createMockSupabase()

  const execution = await startAndRun(supabase)

  assert.equal(execution.status, 'completed')
  assert.deepEqual(execution.steps.map((step) => step.typeKey), [
    'trigger.lead_added_to_campaign',
    'action.create_ai_draft',
    'wait.wait_days',
  ])
  assert.deepEqual(execution.steps.map((step) => step.status), ['completed', 'completed', 'completed'])
  assert.equal(execution.steps[2].output.message, 'Simulated wait')
})

test('condition.reply_received chooses the yes branch', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('condition-1', 'condition.reply_received', 'Condition'),
        createNode('team-1', 'action.create_team_decision', 'Action'),
        createNode('follow-up-1', 'action.create_follow_up_draft', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'condition-1', label: '' },
        { id: 'edge-2', source: 'condition-1', target: 'team-1', label: 'Yes' },
        { id: 'edge-3', source: 'condition-1', target: 'follow-up-1', label: 'No' },
      ],
    })],
  })

  const execution = await startAndRun(supabase, { context: { replyReceived: true } })

  assert.equal(execution.status, 'completed')
  assert.deepEqual(execution.steps.map((step) => step.nodeId), ['trigger-1', 'condition-1', 'team-1'])
  assert.equal(execution.steps[1].output.selectedBranch, 'Yes')
})

test('condition.reply_received chooses the no branch', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('condition-1', 'condition.reply_received', 'Condition'),
        createNode('team-1', 'action.create_team_decision', 'Action'),
        createNode('follow-up-1', 'action.create_follow_up_draft', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'condition-1', label: '' },
        { id: 'edge-2', source: 'condition-1', target: 'team-1', label: 'Yes' },
        { id: 'edge-3', source: 'condition-1', target: 'follow-up-1', label: 'No' },
      ],
    })],
  })

  const execution = await startAndRun(supabase, { context: { replyReceived: false } })

  assert.equal(execution.status, 'completed')
  assert.deepEqual(execution.steps.map((step) => step.nodeId), ['trigger-1', 'condition-1', 'follow-up-1'])
  assert.equal(execution.steps[1].output.selectedBranch, 'No')
})

test('wait_for_approval pauses execution', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
        createNode('send-1', 'action.send_approved_email', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'approval-1', label: '' },
        { id: 'edge-2', source: 'approval-1', target: 'send-1', label: '' },
      ],
    })],
  })

  const execution = await startAndRun(supabase)

  assert.equal(execution.status, 'paused')
  assert.deepEqual(execution.steps.map((step) => step.typeKey), [
    'trigger.lead_added_to_campaign',
    'wait.wait_for_approval',
  ])
  assert.equal(execution.steps[1].status, 'paused')
})

test('send approved email does not bypass email safety', async () => {
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('send-1', 'action.send_approved_email', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'send-1', label: '' },
      ],
    })],
  })

  const execution = await startAndRun(supabase)
  const sendStep = execution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(execution.status, 'completed')
  assert.equal(sendStep.status, 'completed')
  assert.equal(sendStep.output.realSendingEnabled, false)
  assert.equal(sendStep.output.result, 'Approved email simulated. No real email sent.')
  assert.equal(supabase.calls.some((call) => call[1] === 'sent_emails'), false)
  assert.equal(supabase.calls.some((call) => call[1] === 'email_accounts'), false)
})



test('workflow execution resume requires auth', async () => {
  env.auth.required = true

  const { response, payload } = await requestApp('/api/workflow-executions/execution-1/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { replyReceived: false } }),
  })

  assert.equal(response.status, 401)
  assert.equal(payload.message, 'Authentication token is required.')
})

test('resume paused approval execution continues to next node', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
        createNode('team-1', 'action.create_team_decision', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'approval-1', label: '' },
        { id: 'edge-2', source: 'approval-1', target: 'team-1', label: '' },
      ],
    })],
  })

  const pausedExecution = await startAndRun(supabase)
  const resumedExecution = await resumeExecution(supabase, pausedExecution.id)

  assert.equal(pausedExecution.status, 'paused')
  assert.equal(resumedExecution.status, 'completed')
  assert.deepEqual(resumedExecution.steps.map((step) => step.nodeId), ['trigger-1', 'approval-1', 'team-1'])
  assert.equal(resumedExecution.steps[1].status, 'completed')
  assert.equal(resumedExecution.steps[1].output.approved, true)
  assert.equal(resumedExecution.steps[2].typeKey, 'action.create_team_decision')
})

test('resume can complete remaining safe mock email and wait steps', async () => {
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
        createNode('send-1', 'action.send_approved_email', 'Action'),
        createNode('wait-1', 'wait.wait_days', 'Wait', { duration: '2', unit: 'days' }),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'approval-1', label: '' },
        { id: 'edge-2', source: 'approval-1', target: 'send-1', label: '' },
        { id: 'edge-3', source: 'send-1', target: 'wait-1', label: '' },
      ],
    })],
  })

  const pausedExecution = await startAndRun(supabase)
  const resumedExecution = await resumeExecution(supabase, pausedExecution.id)
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')
  const waitStep = resumedExecution.steps.find((step) => step.typeKey === 'wait.wait_days')

  assert.equal(resumedExecution.status, 'completed')
  assert.equal(sendStep.status, 'completed')
  assert.equal(sendStep.output.message, 'Approved email simulated. No real email sent.')
  assert.equal(waitStep.output.message, 'Simulated wait')
})

test('resume respects condition.replyReceived branch', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
        createNode('condition-1', 'condition.reply_received', 'Condition'),
        createNode('team-1', 'action.create_team_decision', 'Action'),
        createNode('follow-up-1', 'action.create_follow_up_draft', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'approval-1', label: '' },
        { id: 'edge-2', source: 'approval-1', target: 'condition-1', label: '' },
        { id: 'edge-3', source: 'condition-1', target: 'team-1', label: 'Yes' },
        { id: 'edge-4', source: 'condition-1', target: 'follow-up-1', label: 'No' },
      ],
    })],
  })

  const pausedExecution = await startAndRun(supabase, { context: { replyReceived: false } })
  const resumedExecution = await resumeExecution(supabase, pausedExecution.id, { replyReceived: true })

  assert.equal(resumedExecution.status, 'completed')
  assert.deepEqual(resumedExecution.steps.map((step) => step.nodeId), [
    'trigger-1',
    'approval-1',
    'condition-1',
    'team-1',
  ])
  assert.equal(resumedExecution.steps[2].output.selectedBranch, 'Yes')
})

test('resume does not bypass real email safety', async () => {
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
        createNode('send-1', 'action.send_approved_email', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'approval-1', label: '' },
        { id: 'edge-2', source: 'approval-1', target: 'send-1', label: '' },
      ],
    })],
  })

  const pausedExecution = await startAndRun(supabase)
  const resumedExecution = await resumeExecution(supabase, pausedExecution.id)
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(sendStep.status, 'completed')
  assert.equal(sendStep.output.realSendingEnabled, false)
  assert.equal(sendStep.output.message, 'Approved email simulated. No real email sent.')
  assert.equal(supabase.calls.some((call) => call[1] === 'sent_emails'), false)
  assert.equal(supabase.calls.some((call) => call[1] === 'email_accounts'), false)
})
