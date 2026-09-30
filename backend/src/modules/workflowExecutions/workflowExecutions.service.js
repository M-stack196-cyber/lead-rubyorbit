import { createSupabaseServiceClient } from '../../config/supabase.js'
import { getCurrentWorkspaceId, scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'
import { getEmailSendingStatus } from '../emailSending/emailSending.service.js'

const workflowDraftSelect = `
  id,
  workspace_id,
  name,
  status,
  mode,
  nodes,
  edges,
  summary,
  validation_status,
  created_at,
  updated_at
`

const executionSelect = `
  id,
  workspace_id,
  workflow_draft_id,
  lead_id,
  campaign_id,
  status,
  current_node_id,
  started_at,
  completed_at,
  error_message,
  context,
  created_at,
  updated_at
`

const stepSelect = `
  id,
  execution_id,
  node_id,
  node_type,
  type_key,
  status,
  input,
  output,
  error_message,
  started_at,
  completed_at,
  created_at
`

const supportedTypeKeys = new Set([
  'trigger.lead_added_to_campaign',
  'action.create_ai_draft',
  'wait.wait_for_approval',
  'action.send_approved_email',
  'wait.wait_days',
  'condition.reply_received',
  'action.create_team_decision',
  'action.create_follow_up_draft',
])

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  return supabase
}

function getClient(context = {}) {
  return context.supabase || getSupabaseClient()
}

function getWorkspaceId(context = {}) {
  return context.workspaceId || getCurrentWorkspaceId()
}

function normalizeObject(value, fallback = {}) {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError('context must be an object.')
  }
  return value
}

function mapExecution(row, steps = []) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workflowDraftId: row.workflow_draft_id,
    leadId: row.lead_id,
    campaignId: row.campaign_id,
    status: row.status,
    currentNodeId: row.current_node_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    context: row.context || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps,
  }
}

function mapStep(row) {
  return {
    id: row.id,
    executionId: row.execution_id,
    nodeId: row.node_id,
    nodeType: row.node_type,
    typeKey: row.type_key,
    status: row.status,
    input: row.input || {},
    output: row.output || {},
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

function normalizeNode(node = {}) {
  const data = node.data || {}
  return {
    ...node,
    id: String(node.id || ''),
    nodeType: node.type || data.kind || data.category || data.type || null,
    typeKey: node.typeKey || data.typeKey || '',
    label: node.label || data.label || '',
    module: node.module || data.module || '',
    operation: node.operation || data.operation || '',
    settings: node.settings || data.settings || {},
  }
}

function normalizeEdge(edge = {}) {
  return {
    ...edge,
    id: String(edge.id || `${edge.source || ''}-${edge.target || ''}`),
    source: String(edge.source || ''),
    target: String(edge.target || ''),
    label: String(edge.label || edge.data?.label || '').trim(),
  }
}

function buildGraph(draft) {
  const nodes = Array.isArray(draft.nodes) ? draft.nodes.map(normalizeNode).filter((node) => node.id) : []
  const edges = Array.isArray(draft.edges) ? draft.edges.map(normalizeEdge).filter((edge) => edge.source && edge.target) : []
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const outgoingByNodeId = new Map()

  edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return
    const outgoing = outgoingByNodeId.get(edge.source) || []
    outgoing.push(edge)
    outgoingByNodeId.set(edge.source, outgoing)
  })

  const startNode = nodes.find((node) => node.typeKey.startsWith('trigger.'))
    || nodes.find((node) => String(node.nodeType || '').toLowerCase() === 'trigger')
    || nodes[0]

  if (!startNode) {
    throw createHttpError('Workflow draft must include at least one node.')
  }

  return {
    nodeById,
    outgoingByNodeId,
    startNode,
  }
}

async function getWorkflowDraftById(supabase, workflowDraftId, workspaceId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').select(workflowDraftSelect),
    workspaceId,
  )
    .eq('id', workflowDraftId)
    .single()

  if (error) {
    throw createHttpError(error.code === 'PGRST116' ? 'Workflow draft not found.' : error.message, error.code === 'PGRST116' ? 404 : 500)
  }

  return data
}

async function getExecutionRow(supabase, executionId, workspaceId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_executions').select(executionSelect),
    workspaceId,
  )
    .eq('id', executionId)
    .single()

  if (error) {
    throw createHttpError(error.code === 'PGRST116' ? 'Workflow execution not found.' : error.message, error.code === 'PGRST116' ? 404 : 500)
  }

  return data
}

async function listStepRows(supabase, executionId) {
  const { data, error } = await supabase
    .from('workflow_execution_steps')
    .select(stepSelect)
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data || []
}

async function getExecutionWithSteps(supabase, executionId, workspaceId) {
  const execution = await getExecutionRow(supabase, executionId, workspaceId)
  const steps = await listStepRows(supabase, executionId)
  return mapExecution(execution, steps.map(mapStep))
}

async function insertExecution(supabase, payload, workspaceId) {
  const { data, error } = await supabase
    .from('workflow_executions')
    .insert(withWorkspaceFields({
      workflow_draft_id: payload.workflowDraftId,
      lead_id: payload.leadId || null,
      campaign_id: payload.campaignId || null,
      status: 'running',
      current_node_id: null,
      context: normalizeObject(payload.context),
    }, workspaceId))
    .select(executionSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

async function insertStep(supabase, executionId, node, input) {
  const { data, error } = await supabase
    .from('workflow_execution_steps')
    .insert({
      execution_id: executionId,
      node_id: node.id,
      node_type: node.nodeType,
      type_key: node.typeKey,
      status: 'running',
      input,
      output: {},
    })
    .select(stepSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

async function updateStep(supabase, stepId, values) {
  const { data, error } = await supabase
    .from('workflow_execution_steps')
    .update(values)
    .eq('id', stepId)
    .select(stepSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

async function updateExecution(supabase, executionId, values, workspaceId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_executions').update(values),
    workspaceId,
  )
    .eq('id', executionId)
    .select(executionSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

function selectNextNodeId(node, outgoing, context) {
  if (!outgoing.length) return null

  if (node.typeKey === 'condition.reply_received') {
    const targetLabel = context.replyReceived ? 'yes' : 'no'
    const matchingEdge = outgoing.find((edge) => edge.label.toLowerCase() === targetLabel)
    return (matchingEdge || outgoing[0]).target
  }

  return outgoing[0].target
}

function executeNode(node, input) {
  switch (node.typeKey) {
    case 'trigger.lead_added_to_campaign':
      return {
        status: 'completed',
        output: {
          message: 'Lead added to campaign trigger accepted.',
          leadId: input.leadId || null,
          campaignId: input.campaignId || null,
        },
      }
    case 'action.create_ai_draft':
      return {
        status: 'completed',
        output: {
          draftStatus: 'simulated',
          subject: 'Simulated AI outreach draft',
          body: 'Simulated AI draft body for workflow execution demo.',
        },
      }
    case 'wait.wait_for_approval':
      return {
        status: 'paused',
        output: {
          reason: 'Waiting for teammate approval before continuing.',
        },
      }
    case 'action.send_approved_email': {
      const emailStatus = getEmailSendingStatus()
      if (emailStatus.realSendingEnabled) {
        return {
          status: 'paused',
          output: {
            emailSendMode: emailStatus.mode,
            realSendingEnabled: true,
            message: 'Live sending is available, but workflow execution MVP will not auto-send without an explicit approved draft and account.',
          },
        }
      }

      return {
        status: 'completed',
        output: {
          emailSendMode: emailStatus.mode,
          realSendingEnabled: false,
          message: emailStatus.message,
          result: 'Mock completed. No real email was sent.',
        },
      }
    }
    case 'wait.wait_days':
      return {
        status: 'completed',
        output: {
          message: 'Simulated wait',
          duration: node.settings?.duration || null,
          unit: node.settings?.unit || 'days',
        },
      }
    case 'condition.reply_received':
      return {
        status: 'completed',
        output: {
          replyReceived: Boolean(input.context?.replyReceived),
          selectedBranch: input.context?.replyReceived ? 'Yes' : 'No',
        },
      }
    case 'action.create_team_decision':
      return {
        status: 'completed',
        output: {
          decisionStatus: 'simulated',
          message: 'Simulated team decision task created.',
        },
      }
    case 'action.create_follow_up_draft':
      return {
        status: 'completed',
        output: {
          draftStatus: 'simulated',
          subject: 'Simulated follow-up draft',
          body: 'Simulated follow-up body for workflow execution demo.',
        },
      }
    default:
      return {
        status: 'skipped',
        output: {
          reason: supportedTypeKeys.has(node.typeKey) ? 'No-op block.' : 'Unsupported workflow block for MVP runner.',
        },
      }
  }
}

export async function startWorkflowExecution(payload = {}, context = {}) {
  if (!payload.workflowDraftId) {
    throw createHttpError('workflowDraftId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)

  await getWorkflowDraftById(supabase, payload.workflowDraftId, workspaceId)
  const execution = await insertExecution(supabase, payload, workspaceId)

  return mapExecution(execution)
}

export async function runWorkflowExecution({ executionId } = {}, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  let execution = await getExecutionRow(supabase, executionId, workspaceId)

  if (!['running', 'paused'].includes(execution.status)) {
    return getExecutionWithSteps(supabase, executionId, workspaceId)
  }

  const draft = await getWorkflowDraftById(supabase, execution.workflow_draft_id, workspaceId)
  const graph = buildGraph(draft)
  let currentNodeId = execution.current_node_id || graph.startNode.id
  const visited = new Set()

  try {
    while (currentNodeId) {
      if (visited.has(currentNodeId)) {
        throw createHttpError(`Workflow contains a cycle at node ${currentNodeId}.`, 400)
      }

      visited.add(currentNodeId)
      const node = graph.nodeById.get(currentNodeId)
      if (!node) {
        throw createHttpError(`Workflow node ${currentNodeId} was not found in draft.`, 400)
      }

      execution = await updateExecution(supabase, executionId, {
        status: 'running',
        current_node_id: node.id,
        error_message: null,
      }, workspaceId)

      const input = {
        context: execution.context || {},
        leadId: execution.lead_id,
        campaignId: execution.campaign_id,
        settings: node.settings || {},
      }
      const step = await insertStep(supabase, executionId, node, input)
      const result = executeNode(node, input)
      await updateStep(supabase, step.id, {
        status: result.status,
        output: result.output || {},
        error_message: null,
        completed_at: new Date().toISOString(),
      })

      if (result.status === 'paused') {
        await updateExecution(supabase, executionId, {
          status: 'paused',
          current_node_id: node.id,
          completed_at: null,
          error_message: null,
        }, workspaceId)
        return getExecutionWithSteps(supabase, executionId, workspaceId)
      }

      const outgoing = graph.outgoingByNodeId.get(node.id) || []
      currentNodeId = selectNextNodeId(node, outgoing, execution.context || {})
    }

    await updateExecution(supabase, executionId, {
      status: 'completed',
      current_node_id: null,
      completed_at: new Date().toISOString(),
      error_message: null,
    }, workspaceId)
  } catch (error) {
    await updateExecution(supabase, executionId, {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }, workspaceId)
    throw error
  }

  return getExecutionWithSteps(supabase, executionId, workspaceId)
}

export async function getWorkflowExecution(executionId, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  return getExecutionWithSteps(getClient(context), executionId, getWorkspaceId(context))
}
