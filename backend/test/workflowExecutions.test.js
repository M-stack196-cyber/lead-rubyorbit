import assert from 'node:assert/strict'
import http from 'node:http'
import { afterEach, test } from 'node:test'

import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import {
  cancelWorkflowExecution,
  resumeDueWorkflowExecutions,
  resumeWorkflowExecution,
  retryWorkflowExecution,
  runWorkflowExecution,
  startWorkflowExecution,
  triggerLeadAddedToCampaignWorkflows,
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
    is_active: false,
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

function createLeadRow(overrides = {}) {
  return {
    id: 'lead-1',
    workspace_id: 'workspace-1',
    name: 'Workflow Lead',
    email: 'lead@example.com',
    company: 'Example Co',
    ...overrides,
  }
}

function createCampaignLeadRow(overrides = {}) {
  return {
    id: 'campaign-lead-1',
    workspace_id: 'workspace-1',
    campaign_id: 'campaign-1',
    lead_id: 'lead-1',
    campaigns: {
      id: 'campaign-1',
      name: 'Growth Campaign',
      description: 'book meetings with qualified operators',
    },
    leads: {
      id: 'lead-1',
      name: 'Workflow Lead',
      email: 'lead@example.com',
      company: 'Example Co',
    },
    ...overrides,
  }
}

function createEmailDraftRow(overrides = {}) {
  return {
    id: 'email-draft-1',
    workspace_id: 'workspace-1',
    campaign_id: 'campaign-1',
    lead_id: 'lead-1',
    campaign_lead_id: 'campaign-lead-1',
    type: 'primary',
    subject: 'Persisted subject',
    body: 'Persisted body',
    status: 'pending_approval',
    ai_generated: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    leads: {
      id: 'lead-1',
      name: 'Workflow Lead',
      email: 'lead@example.com',
      company: 'Example Co',
    },
    ...overrides,
  }
}

function createEmailAccountRow(overrides = {}) {
  return {
    id: 'account-1',
    workspace_id: 'workspace-1',
    provider: 'gmail',
    email_address: 'incdatamart@gmail.com',
    from_name: 'Inc Data Mart',
    status: 'active',
    is_enabled: true,
    daily_send_limit: 50,
    sent_today: 0,
    last_used_at: null,
    gmail_email: 'incdatamart@gmail.com',
    gmail_token_status: 'connected',
    gmail_refresh_token_encrypted: 'encrypted-refresh-token',
    gmail_access_token_encrypted: 'encrypted-access-token',
    gmail_token_expires_at: '2026-10-01T00:00:00.000Z',
    smtp_host: null,
    smtp_port: null,
    smtp_username: null,
    smtp_secure: false,
    smtp_secret_encrypted: null,
    ...overrides,
  }
}

function createMockSupabase({
  workflowDrafts = [createWorkflowDraftRow()],
  workflowExecutions = [],
  campaignLeads = [],
  emailDrafts = [],
  leads = [],
  emailAccounts = [],
} = {}) {
  const tables = {
    workflow_drafts: [...workflowDrafts],
    workflow_executions: [...workflowExecutions],
    workflow_execution_steps: [],
    campaign_leads: [...campaignLeads],
    email_drafts: [...emailDrafts],
    leads: [...leads],
    email_accounts: [...emailAccounts],
    sent_emails: [],
    audit_logs: [],
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
      ltFilters: [],
      lteFilters: [],
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
      lt(field, value) {
        state.ltFilters.push([field, value])
        calls.push(['lt', table, field, value])
        return query
      },
      lte(field, value) {
        state.lteFilters.push([field, value])
        calls.push(['lte', table, field, value])
        return query
      },
      maybeSingle() {
        calls.push(['maybeSingle', table])
        return Promise.resolve(executeMaybeSingle())
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

    function fieldValue(row, field) {
      if (field.includes('->>')) {
        const [jsonField, jsonKey] = field.split('->>')
        return row[jsonField]?.[jsonKey]
      }

      return row[field]
    }

    function matches(row) {
      return state.filters.every(([field, value]) => fieldValue(row, field) === value)
        && state.ltFilters.every(([field, value]) => Number(fieldValue(row, field) || 0) < Number(value))
        && state.lteFilters.every(([field, value]) => String(fieldValue(row, field) || '') <= String(value))
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
          scheduled_resume_at: null,
          pause_reason: null,
          retry_count: 0,
          canceled_at: null,
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

      if (table === 'sent_emails') {
        return {
          id: nextId('sent-email'),
          status: 'sent',
          sent_at: now(),
          created_at: now(),
          updated_at: now(),
          ...values,
        }
      }

      if (table === 'email_drafts') {
        return {
          id: nextId('email-draft'),
          status: 'pending_approval',
          created_at: now(),
          updated_at: now(),
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

    function executeMaybeSingle() {
      if (state.updateValues) {
        const idFilter = state.filters.find(([field]) => field === 'id')
        const row = tables[table].find(matches) || (idFilter ? tables[table].find((item) => item.id === idFilter[1]) : null)
        if (!row) return { data: null, error: null }

        Object.assign(row, state.updateValues, { updated_at: now() })
        return { data: row, error: null }
      }

      const rows = tables[table].filter(matches)
      return { data: rows[0] || null, error: null }
    }

    function executeSingle() {
      if (state.insertValues) {
        if (Array.isArray(state.insertValues)) {
          const rows = state.insertValues.map((value) => defaultsForInsert(value))
          tables[table].push(...rows)
          return { data: rows, error: null }
        }

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
    ...payload,
    context: { forceImmediateWait: true, ...(payload.context || {}) },
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
  const supabase = createMockSupabase({ leads: [createLeadRow()] })

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
  assert.equal(execution.context.recipientEmail, 'lead@example.com')
  assert.equal(execution.context.recipientName, 'Workflow Lead')
  assert.equal(execution.context.recipientCompany, 'Example Co')
  assert.equal(supabase.tables.workflow_executions.length, 1)
  assert.equal(
    supabase.calls.filter((call) => call[0] === 'eq' && call[2] === 'workspace_id').every((call) => call[3] === 'workspace-1'),
    true,
  )
})

test('workflow run with leadId loads lead email into context', async () => {
  const supabase = createMockSupabase({
    leads: [createLeadRow({ email: 'real-lead@example.com', name: 'Real Lead', company: 'Real Co' })],
  })

  const execution = await startAndRun(supabase, { leadId: 'lead-1' })
  const draftStep = execution.steps.find((step) => step.typeKey === 'action.create_ai_draft')

  assert.equal(execution.context.recipientEmail, 'real-lead@example.com')
  assert.equal(execution.context.recipientName, 'Real Lead')
  assert.equal(execution.context.recipientCompany, 'Real Co')
  assert.equal(draftStep.output.recipientEmail, 'real-lead@example.com')
  assert.match(draftStep.output.subject, /Real Co/)
  assert.match(draftStep.output.body, /Real Lead/)
})

test('workflow run with manual recipientEmail validates and passes to send step', async () => {
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  const supabase = createMockSupabase({ workflowDrafts: [createApprovedSendWorkflow()] })

  const pausedExecution = await startAndRun(supabase, {
    context: {
      recipientEmail: 'manual@example.com',
      recipientName: 'Manual Recipient',
      recipientCompany: 'Manual Co',
    },
  })
  const resumedExecution = await resumeExecution(supabase, pausedExecution.id)
  const draftStep = resumedExecution.steps.find((step) => step.typeKey === 'action.create_ai_draft')
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(resumedExecution.context.recipientEmail, 'manual@example.com')
  assert.equal(draftStep.output.recipientEmail, 'manual@example.com')
  assert.equal(sendStep.output.emailStatus, 'mock')
  assert.equal(sendStep.output.toEmail, 'manual@example.com')
})

test('workflow run with invalid manual recipientEmail fails safely', async () => {
  const supabase = createMockSupabase()

  await assert.rejects(
    startWorkflowExecution({
      workflowDraftId: 'workflow-1',
      context: { recipientEmail: 'not-an-email' },
    }, {
      supabase,
      workspaceId: 'workspace-1',
    }),
    /recipientEmail must be a valid email address/,
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
  assert.equal(sendStep.output.emailStatus, 'mock')
  assert.equal(sendStep.output.message, 'Email prepared in mock mode. No real email sent.')
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
  assert.equal(sendStep.output.message, 'Email prepared in mock mode. No real email sent.')
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
  assert.equal(sendStep.output.message, 'Email prepared in mock mode. No real email sent.')
  assert.equal(supabase.calls.some((call) => call[1] === 'sent_emails'), false)
  assert.equal(supabase.calls.some((call) => call[1] === 'email_accounts'), false)
})


function createApprovedSendWorkflow() {
  return createWorkflowDraftRow({
    nodes: [
      createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
      createNode('draft-1', 'action.create_ai_draft', 'Action'),
      createNode('approval-1', 'wait.wait_for_approval', 'Wait'),
      createNode('send-1', 'action.send_approved_email', 'Action'),
    ],
    edges: [
      { id: 'edge-1', source: 'trigger-1', target: 'draft-1', label: '' },
      { id: 'edge-2', source: 'draft-1', target: 'approval-1', label: '' },
      { id: 'edge-3', source: 'approval-1', target: 'send-1', label: '' },
    ],
  })
}

test('workflow send approved email in mock mode does not send', async () => {
  env.emailSend.mode = 'mock'
  env.emailSend.liveApproved = false
  let senderCalls = 0
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    leads: [createLeadRow()],
    emailAccounts: [createEmailAccountRow()],
  })

  const pausedExecution = await startAndRun(supabase, { leadId: 'lead-1' })
  const resumedExecution = await resumeWorkflowExecution({
    executionId: pausedExecution.id,
    context: {},
  }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async () => {
      senderCalls += 1
      throw new Error('Sender should not be called in mock mode.')
    },
  })
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(senderCalls, 0)
  assert.equal(sendStep.output.emailStatus, 'mock')
  assert.equal(sendStep.output.message, 'Email prepared in mock mode. No real email sent.')
  assert.equal(supabase.tables.sent_emails.length, 0)
})

test('workflow send approved email in live mode without approval flag does not send', async () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = false
  let senderCalls = 0
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    leads: [createLeadRow()],
    emailAccounts: [createEmailAccountRow()],
  })

  const pausedExecution = await startAndRun(supabase, { leadId: 'lead-1' })
  const resumedExecution = await resumeWorkflowExecution({ executionId: pausedExecution.id }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async () => {
      senderCalls += 1
      throw new Error('Sender should not be called without live approval.')
    },
  })
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(senderCalls, 0)
  assert.equal(sendStep.output.emailStatus, 'blocked')
  assert.equal(sendStep.output.message, 'Email sending blocked by safety controls.')
  assert.equal(sendStep.output.blockedReasons.includes('EMAIL_SEND_LIVE_APPROVED is not true.'), true)
  assert.equal(supabase.tables.sent_emails.length, 0)
})

test('workflow send approved email in live approved mode sends through mocked Gmail sender', async () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = true
  const sentDrafts = []
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    leads: [createLeadRow({ email: 'buyer@example.com' })],
    emailAccounts: [createEmailAccountRow()],
  })

  const pausedExecution = await startAndRun(supabase, { leadId: 'lead-1' })
  const resumedExecution = await resumeWorkflowExecution({ executionId: pausedExecution.id }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async ({ account, draft }) => {
      sentDrafts.push({ account, draft })
      return {
        messageId: 'gmail-message-1',
        threadId: 'gmail-thread-1',
        sentAt: '2026-09-30T12:30:00.000Z',
      }
    },
  })
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(sentDrafts.length, 1)
  assert.equal(sentDrafts[0].account.email_address, 'incdatamart@gmail.com')
  assert.equal(sentDrafts[0].draft.leads.email, 'buyer@example.com')
  assert.equal(sendStep.output.emailStatus, 'sent')
  assert.equal(sendStep.output.messageId, 'gmail-message-1')
  assert.equal(supabase.tables.sent_emails.length, 1)
  assert.equal(supabase.tables.sent_emails[0].provider_message_id, 'gmail-message-1')
  assert.equal(supabase.tables.email_accounts[0].sent_today, 1)
})

test('workflow send approved email blocks when recipient is missing', async () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = true
  let senderCalls = 0
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    leads: [createLeadRow({ email: '' })],
    emailAccounts: [createEmailAccountRow()],
  })

  const pausedExecution = await startAndRun(supabase, { leadId: 'lead-1' })
  const resumedExecution = await resumeWorkflowExecution({ executionId: pausedExecution.id }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async () => {
      senderCalls += 1
      throw new Error('Sender should not be called without recipient.')
    },
  })
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(senderCalls, 0)
  assert.equal(sendStep.output.emailStatus, 'blocked')
  assert.equal(sendStep.output.blockedReasons.includes('Recipient email is missing.'), true)
  assert.equal(supabase.tables.sent_emails.length, 0)
})

test('workflow direct send requires recorded approval before live sending', async () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = true
  let senderCalls = 0
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
    leads: [createLeadRow()],
    emailAccounts: [createEmailAccountRow()],
  })

  const startedExecution = await startWorkflowExecution({
    workflowDraftId: 'workflow-1',
    leadId: 'lead-1',
    context: {
      subject: 'Approved subject',
      body: 'Approved body',
    },
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const execution = await runWorkflowExecution({ executionId: startedExecution.id }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async () => {
      senderCalls += 1
      throw new Error('Sender should not be called without recorded approval.')
    },
  })
  const sendStep = execution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(senderCalls, 0)
  assert.equal(sendStep.output.emailStatus, 'blocked')
  assert.equal(sendStep.output.blockedReasons.includes('Workflow approval has not been recorded.'), true)
})

test('inactive workflow does not auto-trigger when lead is added to campaign', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({ is_active: false })],
    leads: [createLeadRow()],
    campaignLeads: [createCampaignLeadRow()],
  })

  const executions = await triggerLeadAddedToCampaignWorkflows({
    leadId: 'lead-1',
    campaignId: 'campaign-1',
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(executions.length, 0)
  assert.equal(supabase.tables.workflow_executions.length, 0)
  assert.equal(supabase.tables.email_drafts.length, 0)
})

test('active workflow auto-triggers when lead is added to campaign', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({ is_active: true })],
    leads: [createLeadRow()],
    campaignLeads: [createCampaignLeadRow()],
  })

  const executions = await triggerLeadAddedToCampaignWorkflows({
    leadId: 'lead-1',
    campaignId: 'campaign-1',
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(executions.length, 1)
  assert.equal(executions[0].status, 'paused')
  assert.equal(executions[0].pauseReason, 'scheduled_wait')
  assert.equal(executions[0].context.autoTriggered, true)
  assert.equal(executions[0].context.triggerSource, 'lead_added_to_campaign')
  assert.equal(executions[0].context.recipientEmail, 'lead@example.com')
  assert.equal(supabase.tables.email_drafts.length, 1)
  assert.equal(supabase.tables.email_drafts[0].status, 'pending_approval')
})

test('auto-trigger prevents duplicate workflow lead campaign runs', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({ is_active: true })],
    leads: [createLeadRow()],
    campaignLeads: [createCampaignLeadRow()],
    workflowExecutions: [{
      id: 'execution-existing',
      workspace_id: 'workspace-1',
      workflow_draft_id: 'workflow-1',
      lead_id: 'lead-1',
      campaign_id: 'campaign-1',
      status: 'completed',
      current_node_id: null,
      started_at: '2026-09-30T12:00:00.000Z',
      completed_at: '2026-09-30T12:01:00.000Z',
      error_message: null,
      context: { triggerSource: 'lead_added_to_campaign' },
      created_at: '2026-09-30T12:00:00.000Z',
      updated_at: '2026-09-30T12:01:00.000Z',
    }],
  })

  const executions = await triggerLeadAddedToCampaignWorkflows({
    leadId: 'lead-1',
    campaignId: 'campaign-1',
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(executions.length, 0)
  assert.equal(supabase.tables.workflow_executions.length, 1)
  assert.equal(supabase.tables.email_drafts.length, 0)
})

test('create_ai_draft persists a pending approval email draft when campaign lead context exists', async () => {
  const supabase = createMockSupabase({
    leads: [createLeadRow({ name: 'Persist Lead', company: 'Persist Co' })],
    campaignLeads: [createCampaignLeadRow({
      leads: { id: 'lead-1', name: 'Persist Lead', email: 'lead@example.com', company: 'Persist Co' },
    })],
  })

  const execution = await startAndRun(supabase, { leadId: 'lead-1', campaignId: 'campaign-1' })
  const draftStep = execution.steps.find((step) => step.typeKey === 'action.create_ai_draft')

  assert.equal(supabase.tables.email_drafts.length, 1)
  assert.equal(supabase.tables.email_drafts[0].status, 'pending_approval')
  assert.equal(supabase.tables.email_drafts[0].campaign_lead_id, 'campaign-lead-1')
  assert.equal(draftStep.output.persisted, true)
  assert.equal(draftStep.output.emailDraftId, supabase.tables.email_drafts[0].id)
})

test('send approved email uses persisted draft subject and body when available', async () => {
  env.emailSend.mode = 'live'
  env.emailSend.liveApproved = true
  const sentDrafts = []
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    leads: [createLeadRow({ email: 'buyer@example.com', name: 'Buyer Lead', company: 'Buyer Co' })],
    campaignLeads: [createCampaignLeadRow({
      leads: { id: 'lead-1', name: 'Buyer Lead', email: 'buyer@example.com', company: 'Buyer Co' },
      campaigns: { id: 'campaign-1', name: 'Buyer Campaign', description: 'sell safely' },
    })],
    emailAccounts: [createEmailAccountRow()],
  })

  const pausedExecution = await startAndRun(supabase, { leadId: 'lead-1', campaignId: 'campaign-1' })
  const persistedDraft = supabase.tables.email_drafts[0]
  persistedDraft.subject = 'Persisted controlled subject'
  persistedDraft.body = 'Persisted controlled body'

  const resumedExecution = await resumeWorkflowExecution({ executionId: pausedExecution.id }, {
    supabase,
    workspaceId: 'workspace-1',
    emailSender: async ({ draft }) => {
      sentDrafts.push(draft)
      return {
        messageId: 'gmail-message-persisted',
        threadId: 'gmail-thread-persisted',
        sentAt: '2026-09-30T12:45:00.000Z',
      }
    },
  })
  const sendStep = resumedExecution.steps.find((step) => step.typeKey === 'action.send_approved_email')

  assert.equal(sentDrafts.length, 1)
  assert.equal(sentDrafts[0].id, persistedDraft.id)
  assert.equal(sentDrafts[0].subject, 'Persisted controlled subject')
  assert.equal(sentDrafts[0].body, 'Persisted controlled body')
  assert.equal(sendStep.output.emailStatus, 'sent')
  assert.equal(sendStep.output.emailDraftId, persistedDraft.id)
  assert.equal(supabase.tables.sent_emails[0].subject, 'Persisted controlled subject')
})

test('wait_days schedules execution instead of completing immediately', async () => {
  const supabase = createMockSupabase()

  const started = await startWorkflowExecution({
    workflowDraftId: 'workflow-1',
    context: {},
  }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const execution = await runWorkflowExecution({ executionId: started.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const waitStep = execution.steps.find((step) => step.typeKey === 'wait.wait_days')

  assert.equal(execution.status, 'paused')
  assert.equal(execution.pauseReason, 'scheduled_wait')
  assert.equal(execution.currentNodeId, 'wait-1')
  assert.ok(execution.scheduledResumeAt)
  assert.equal(waitStep.status, 'paused')
  assert.equal(waitStep.output.message, 'Scheduled wait')
  assert.ok(waitStep.output.scheduledResumeAt)
})

test('forceImmediateWait keeps fast completion path for tests and QA', async () => {
  const supabase = createMockSupabase()
  const execution = await startAndRun(supabase, { context: { forceImmediateWait: true } })
  const waitStep = execution.steps.find((step) => step.typeKey === 'wait.wait_days')

  assert.equal(execution.status, 'completed')
  assert.equal(waitStep.status, 'completed')
  assert.equal(waitStep.output.message, 'Simulated wait')
  assert.equal(waitStep.output.forceImmediateWait, true)
})

test('resume-due continues due scheduled wait', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('wait-1', 'wait.wait_days', 'Wait', { duration: 1, unit: 'days' }),
        createNode('team-1', 'action.create_team_decision', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'wait-1', label: '' },
        { id: 'edge-2', source: 'wait-1', target: 'team-1', label: '' },
      ],
    })],
  })

  const started = await startWorkflowExecution({ workflowDraftId: 'workflow-1', context: {} }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const paused = await runWorkflowExecution({ executionId: started.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  supabase.tables.workflow_executions[0].scheduled_resume_at = '2026-09-30T11:00:00.000Z'

  const summary = await resumeDueWorkflowExecutions({ now: '2026-09-30T12:00:00.000Z' }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const resumed = summary.executions[0]

  assert.equal(paused.status, 'paused')
  assert.equal(summary.processed, 1)
  assert.equal(summary.completed, 1)
  assert.equal(resumed.status, 'completed')
  assert.deepEqual(resumed.steps.map((step) => step.nodeId), ['trigger-1', 'wait-1', 'team-1'])
  assert.equal(resumed.steps[1].status, 'completed')
  assert.equal(resumed.steps[1].output.resumed, true)
})

test('resume-due skips not-yet-due scheduled executions', async () => {
  const supabase = createMockSupabase()
  const started = await startWorkflowExecution({ workflowDraftId: 'workflow-1', context: {} }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  await runWorkflowExecution({ executionId: started.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  supabase.tables.workflow_executions[0].scheduled_resume_at = '2026-10-01T12:00:00.000Z'

  const summary = await resumeDueWorkflowExecutions({ now: '2026-09-30T12:00:00.000Z' }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(summary.processed, 0)
  assert.equal(summary.completed, 0)
  assert.equal(supabase.tables.workflow_executions[0].status, 'paused')
})

test('cancel paused execution prevents continuation', async () => {
  const supabase = createMockSupabase()
  const started = await startWorkflowExecution({ workflowDraftId: 'workflow-1', context: {} }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const paused = await runWorkflowExecution({ executionId: started.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  const canceled = await cancelWorkflowExecution({ executionId: paused.id }, {
    supabase,
    workspaceId: 'workspace-1',
  })
  const summary = await resumeDueWorkflowExecutions({ now: '2026-10-02T12:00:00.000Z' }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(canceled.status, 'canceled')
  assert.ok(canceled.canceledAt)
  assert.equal(summary.processed, 0)
})

test('retry failed execution increments retry_count', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createWorkflowDraftRow({
      nodes: [
        createNode('trigger-1', 'trigger.lead_added_to_campaign', 'Trigger'),
        createNode('team-1', 'action.create_team_decision', 'Action'),
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-1', target: 'team-1', label: '' },
      ],
    })],
    workflowExecutions: [{
      id: 'execution-failed',
      workspace_id: 'workspace-1',
      workflow_draft_id: 'workflow-1',
      lead_id: null,
      campaign_id: null,
      status: 'failed',
      current_node_id: 'team-1',
      started_at: '2026-09-30T12:00:00.000Z',
      completed_at: '2026-09-30T12:01:00.000Z',
      scheduled_resume_at: null,
      pause_reason: null,
      retry_count: 0,
      canceled_at: null,
      error_message: 'Transient failure',
      context: { forceImmediateWait: true },
      created_at: '2026-09-30T12:00:00.000Z',
      updated_at: '2026-09-30T12:01:00.000Z',
    }],
  })

  const retried = await retryWorkflowExecution({ executionId: 'execution-failed' }, {
    supabase,
    workspaceId: 'workspace-1',
  })

  assert.equal(retried.status, 'completed')
  assert.equal(retried.retryCount, 1)
  assert.equal(retried.steps.at(-1).nodeId, 'team-1')
})

test('retry does not duplicate email send', async () => {
  const supabase = createMockSupabase({
    workflowDrafts: [createApprovedSendWorkflow()],
    workflowExecutions: [{
      id: 'execution-email-sent',
      workspace_id: 'workspace-1',
      workflow_draft_id: 'workflow-1',
      lead_id: 'lead-1',
      campaign_id: 'campaign-1',
      status: 'failed',
      current_node_id: 'send-1',
      started_at: '2026-09-30T12:00:00.000Z',
      completed_at: '2026-09-30T12:01:00.000Z',
      scheduled_resume_at: null,
      pause_reason: null,
      retry_count: 0,
      canceled_at: null,
      error_message: 'Post-send failure',
      context: {},
      created_at: '2026-09-30T12:00:00.000Z',
      updated_at: '2026-09-30T12:01:00.000Z',
    }],
  })
  supabase.tables.workflow_execution_steps.push({
    id: 'step-send',
    execution_id: 'execution-email-sent',
    node_id: 'send-1',
    node_type: 'Action',
    type_key: 'action.send_approved_email',
    status: 'completed',
    input: {},
    output: { emailStatus: 'sent', sentEmailId: 'sent-email-1' },
    error_message: null,
    started_at: '2026-09-30T12:00:00.000Z',
    completed_at: '2026-09-30T12:01:00.000Z',
    created_at: '2026-09-30T12:00:00.000Z',
  })

  await assert.rejects(
    retryWorkflowExecution({ executionId: 'execution-email-sent' }, {
      supabase,
      workspaceId: 'workspace-1',
    }),
    /already sent an email/,
  )
})
