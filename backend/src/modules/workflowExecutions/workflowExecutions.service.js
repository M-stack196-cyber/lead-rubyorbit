import { createSupabaseServiceClient } from '../../config/supabase.js'
import { getCurrentWorkspaceId, scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'
import { sendWorkflowApprovedEmail } from '../emailSending/emailSending.service.js'

const workflowDraftSelect = `
  id,
  workspace_id,
  name,
  status,
  is_active,
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
  scheduled_resume_at,
  pause_reason,
  retry_count,
  canceled_at,
  error_message,
  context,
  created_at,
  updated_at
`

const recipientEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const leadSelect = `
  id,
  name,
  email,
  company
`

const campaignLeadSelect = `
  id,
  campaign_id,
  lead_id,
  campaigns (
    id,
    name,
    description
  ),
  leads (
    id,
    name,
    email,
    company
  )
`

const emailDraftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  type,
  subject,
  body,
  status,
  ai_generated,
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

function normalizeRecipientEmail(value) {
  const email = String(value || '').trim()

  if (!email) return ''

  if (!recipientEmailRegex.test(email)) {
    throw createHttpError('recipientEmail must be a valid email address.')
  }

  return email
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
    scheduledResumeAt: row.scheduled_resume_at,
    pauseReason: row.pause_reason,
    retryCount: row.retry_count || 0,
    canceledAt: row.canceled_at,
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

async function getLeadById(supabase, leadId, workspaceId) {
  if (!leadId) return null

  const { data, error } = await scopeWorkspace(
    supabase.from('leads').select(leadSelect),
    workspaceId,
  )
    .eq('id', leadId)
    .single()

  if (error) {
    throw createHttpError(error.code === 'PGRST116' ? 'Lead not found.' : error.message, error.code === 'PGRST116' ? 404 : 500)
  }

  return data
}

async function getCampaignLeadForExecution(supabase, { campaignId, leadId, workspaceId } = {}) {
  if (!campaignId || !leadId) return null

  const { data, error } = await scopeWorkspace(
    supabase.from('campaign_leads').select(campaignLeadSelect),
    workspaceId,
  )
    .eq('campaign_id', campaignId)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

function buildWorkflowDraftCopy({ context = {}, campaignLead = null } = {}) {
  const lead = campaignLead?.leads || {}
  const campaign = campaignLead?.campaigns || {}
  const recipientName = context.recipientName || context.leadName || lead.name || 'there'
  const recipientCompany = context.recipientCompany || context.leadCompany || lead.company || 'your team'
  const campaignName = campaign.name || context.campaignName || 'this campaign'
  const campaignGoal = String(campaign.description || context.campaignDescription || 'explore whether there is a useful fit').trim()

  return {
    subject: 'Quick idea for ' + recipientCompany,
    body: [
      'Hi ' + recipientName + ',',
      '',
      'I wanted to reach out with a focused note for ' + recipientCompany + '.',
      'For ' + campaignName + ', the goal is simple: ' + campaignGoal + '.',
      '',
      'Would you be open to a quick conversation this week?',
      '',
      'Best,',
      'LeadRubyOrbit',
    ].join('\n'),
  }
}

async function persistWorkflowEmailDraft({ supabase, workspaceId, execution, context, campaignLead }) {
  if (!execution.lead_id || !execution.campaign_id || !campaignLead?.id) return null

  const copy = buildWorkflowDraftCopy({ context, campaignLead })
  const { data, error } = await supabase
    .from('email_drafts')
    .insert(withWorkspaceFields({
      campaign_id: execution.campaign_id,
      lead_id: execution.lead_id,
      campaign_lead_id: campaignLead.id,
      type: 'primary',
      subject: copy.subject,
      body: copy.body,
      status: 'pending_approval',
      manual_created: false,
      ai_generated: true,
      ai_model: 'lead-rubyorbit-workflow-template-v1',
      ai_prompt: 'Create workflow outreach draft for lead added to campaign.',
      ai_tone: 'professional',
      ai_generation_type: 'workflow_primary_outreach',
      ai_source: {
        workflowExecutionId: execution.id,
        workflowDraftId: execution.workflow_draft_id,
        campaignLeadId: campaignLead.id,
        campaignId: execution.campaign_id,
        leadId: execution.lead_id,
      },
      created_by: null,
    }, workspaceId))
    .select(emailDraftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  return data
}

function enrichExecutionContext(baseContext = {}, lead = null, campaignLead = null) {
  const context = normalizeObject(baseContext)
  const campaign = campaignLead?.campaigns || null

  if (!lead) {
    const recipientEmail = normalizeRecipientEmail(context.recipientEmail)
    return {
      ...context,
      ...(recipientEmail ? { recipientEmail } : {}),
      ...(campaignLead?.id ? { campaignLeadId: campaignLead.id } : {}),
      ...(campaign?.name ? { campaignName: campaign.name } : {}),
      ...(campaign?.description ? { campaignDescription: campaign.description } : {}),
    }
  }

  const leadEmail = normalizeRecipientEmail(lead.email)

  return {
    ...context,
    recipientEmail: leadEmail || context.recipientEmail || '',
    recipientName: lead.name || context.recipientName || '',
    recipientCompany: lead.company || context.recipientCompany || '',
    leadName: lead.name || context.leadName || '',
    leadCompany: lead.company || context.leadCompany || '',
    campaignLeadId: campaignLead?.id || context.campaignLeadId || '',
    campaignName: campaign?.name || context.campaignName || '',
    campaignDescription: campaign?.description || context.campaignDescription || '',
  }
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
      scheduled_resume_at: null,
      pause_reason: null,
      retry_count: 0,
      canceled_at: null,
      context: payload.context,
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

function hasOwnContextReplyReceived(context = {}) {
  return Object.prototype.hasOwnProperty.call(context, 'replyReceived')
}

function getPreviousSentEmailId(previousSteps = []) {
  const sendStep = [...previousSteps]
    .reverse()
    .find((step) => (step.type_key || step.typeKey) === 'action.send_approved_email')

  return sendStep?.output?.sentEmailId || null
}

async function findStoredWorkflowReply(supabase, { workspaceId, execution, previousSteps }) {
  const sentEmailId = getPreviousSentEmailId(previousSteps)

  if (sentEmailId) {
    const { data, error } = await scopeWorkspace(
      supabase.from('replies').select('id, sent_email_id, lead_id, campaign_id, from_email, subject, received_at'),
      workspaceId,
    )
      .eq('sent_email_id', sentEmailId)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw createHttpError(error.message, 500)
    }

    if (data) return data
  }

  let query = scopeWorkspace(
    supabase.from('replies').select('id, sent_email_id, lead_id, campaign_id, from_email, subject, received_at'),
    workspaceId,
  )

  if (execution?.lead_id) {
    query = query.eq('lead_id', execution.lead_id)
  }

  if (execution?.campaign_id) {
    query = query.eq('campaign_id', execution.campaign_id)
  }

  if (!execution?.lead_id && !execution?.campaign_id) {
    return null
  }

  const { data, error } = await query
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data || null
}

async function evaluateReplyReceivedCondition(input, runtime = {}) {
  if (hasOwnContextReplyReceived(input.context)) {
    const replyReceived = Boolean(input.context.replyReceived)
    return {
      status: 'completed',
      output: {
        replyReceived,
        selectedBranch: replyReceived ? 'Yes' : 'No',
        source: 'context',
        message: replyReceived ? 'Reply found from workflow context.' : 'No reply found from workflow context.',
      },
    }
  }

  const reply = await findStoredWorkflowReply(runtime.supabase, {
    workspaceId: runtime.workspaceId,
    execution: runtime.execution,
    previousSteps: runtime.previousSteps || [],
  })
  const replyReceived = Boolean(reply)

  return {
    status: 'completed',
    output: {
      replyReceived,
      selectedBranch: replyReceived ? 'Yes' : 'No',
      source: 'stored_reply',
      message: replyReceived ? 'Reply found.' : 'No reply found.',
      replyId: reply?.id || null,
      sentEmailId: reply?.sent_email_id || null,
      fromEmail: reply?.from_email || null,
      receivedAt: reply?.received_at || null,
    },
  }
}

function mergeExecutionContext(existingContext, resumeContext) {
  return {
    ...normalizeObject(existingContext),
    ...normalizeObject(resumeContext),
  }
}

function getWaitDaysSettings(node) {
  const settings = node.settings || {}
  const rawDuration = settings.duration ?? settings.days ?? settings.value ?? 1
  const days = Math.max(Number(rawDuration) || 1, 0)
  return {
    days,
    unit: settings.unit || 'days',
  }
}

function getScheduledResumeAt(node, now = new Date()) {
  const { days } = getWaitDaysSettings(node)
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function executeNode(node, input, runtime = {}) {
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
    case 'action.create_ai_draft': {
      const campaignLead = await getCampaignLeadForExecution(runtime.supabase, {
        campaignId: input.campaignId,
        leadId: input.leadId,
        workspaceId: runtime.workspaceId,
      })
      const copy = buildWorkflowDraftCopy({ context: input.context, campaignLead })
      const persistedDraft = await persistWorkflowEmailDraft({
        supabase: runtime.supabase,
        workspaceId: runtime.workspaceId,
        execution: runtime.execution,
        context: input.context || {},
        campaignLead,
      })

      return {
        status: 'completed',
        output: {
          draftStatus: persistedDraft ? 'pending_approval' : 'prepared',
          emailDraftId: persistedDraft?.id || null,
          persisted: Boolean(persistedDraft),
          campaignLeadId: campaignLead?.id || input.context?.campaignLeadId || null,
          recipientEmail: input.context?.recipientEmail || campaignLead?.leads?.email || null,
          subject: persistedDraft?.subject || copy.subject,
          body: persistedDraft?.body || copy.body,
        },
      }
    }
    case 'wait.wait_for_approval':
      return {
        status: 'paused',
        output: {
          reason: 'Waiting for teammate approval before continuing.',
        },
      }
    case 'action.send_approved_email':
      return sendWorkflowApprovedEmail({
        supabase: runtime.supabase,
        workspaceId: runtime.workspaceId,
        leadId: input.leadId,
        campaignId: input.campaignId,
        context: input.context || {},
        settings: input.settings || {},
        previousSteps: runtime.previousSteps || [],
        sender: runtime.emailSender,
      })
    case 'wait.wait_days': {
      const waitSettings = getWaitDaysSettings(node)

      if (input.context?.forceImmediateWait === true) {
        return {
          status: 'completed',
          output: {
            message: 'Simulated wait',
            duration: waitSettings.days,
            unit: waitSettings.unit,
            forceImmediateWait: true,
          },
        }
      }

      return {
        status: 'paused',
        pauseReason: 'scheduled_wait',
        scheduledResumeAt: getScheduledResumeAt(node),
        output: {
          message: 'Scheduled wait',
          pauseReason: 'scheduled_wait',
          scheduledResumeAt: getScheduledResumeAt(node),
          duration: waitSettings.days,
          unit: waitSettings.unit,
        },
      }
    }
    case 'condition.reply_received':
      return evaluateReplyReceivedCondition(input, runtime)
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
  const lead = await getLeadById(supabase, payload.leadId, workspaceId)
  const campaignLead = await getCampaignLeadForExecution(supabase, {
    campaignId: payload.campaignId,
    leadId: payload.leadId,
    workspaceId,
  })
  const execution = await insertExecution(supabase, {
    ...payload,
    context: enrichExecutionContext(payload.context, lead, campaignLead),
  }, workspaceId)

  return mapExecution(execution)
}

async function runExecutionFromNode({ supabase, workspaceId, execution, graph, startNodeId, visitedNodeIds = [], emailSender }) {
  let currentExecution = execution
  let currentNodeId = startNodeId
  const visited = new Set(visitedNodeIds)

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

      currentExecution = await updateExecution(supabase, currentExecution.id, {
        status: 'running',
        current_node_id: node.id,
        scheduled_resume_at: null,
        pause_reason: null,
        canceled_at: null,
        error_message: null,
      }, workspaceId)

      const input = {
        context: currentExecution.context || {},
        leadId: currentExecution.lead_id,
        campaignId: currentExecution.campaign_id,
        settings: node.settings || {},
      }
      const previousSteps = await listStepRows(supabase, currentExecution.id)
      const step = await insertStep(supabase, currentExecution.id, node, input)
      const result = await executeNode(node, input, {
        supabase,
        workspaceId,
        execution: currentExecution,
        previousSteps,
        emailSender,
      })
      await updateStep(supabase, step.id, {
        status: result.status,
        output: result.output || {},
        error_message: null,
        completed_at: result.status === 'paused' ? null : new Date().toISOString(),
      })

      if (result.status === 'paused') {
        await updateExecution(supabase, currentExecution.id, {
          status: 'paused',
          current_node_id: node.id,
          scheduled_resume_at: result.scheduledResumeAt || null,
          pause_reason: result.pauseReason || (node.typeKey === 'wait.wait_for_approval' ? 'approval' : null),
          completed_at: null,
          error_message: null,
        }, workspaceId)
        return getExecutionWithSteps(supabase, currentExecution.id, workspaceId)
      }

      const outgoing = graph.outgoingByNodeId.get(node.id) || []
      const branchContext = node.typeKey === 'condition.reply_received'
        ? { ...(currentExecution.context || {}), replyReceived: result.output?.replyReceived }
        : currentExecution.context || {}
      currentNodeId = selectNextNodeId(node, outgoing, branchContext)
    }

    await updateExecution(supabase, currentExecution.id, {
      status: 'completed',
      current_node_id: null,
      scheduled_resume_at: null,
      pause_reason: null,
      completed_at: new Date().toISOString(),
      error_message: null,
    }, workspaceId)
  } catch (error) {
    await updateExecution(supabase, currentExecution.id, {
      status: 'failed',
      scheduled_resume_at: null,
      pause_reason: null,
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }, workspaceId)
    throw error
  }

  return getExecutionWithSteps(supabase, currentExecution.id, workspaceId)
}

async function markApprovalWaitResumed(supabase, executionId, currentNodeId) {
  const steps = await listStepRows(supabase, executionId)
  const approvalStep = [...steps]
    .reverse()
    .find((step) => step.node_id === currentNodeId && step.type_key === 'wait.wait_for_approval' && step.status === 'paused')

  if (!approvalStep) return

  await updateStep(supabase, approvalStep.id, {
    status: 'completed',
    output: {
      ...(approvalStep.output || {}),
      approved: true,
      resumed: true,
      message: 'Approval received. Workflow resumed.',
    },
    error_message: null,
    completed_at: new Date().toISOString(),
  })
}

export async function runWorkflowExecution({ executionId } = {}, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const execution = await getExecutionRow(supabase, executionId, workspaceId)

  if (execution.status !== 'running') {
    return getExecutionWithSteps(supabase, executionId, workspaceId)
  }

  const draft = await getWorkflowDraftById(supabase, execution.workflow_draft_id, workspaceId)
  const graph = buildGraph(draft)

  return runExecutionFromNode({
    supabase,
    workspaceId,
    execution,
    graph,
    startNodeId: execution.current_node_id || graph.startNode.id,
    emailSender: context.emailSender,
  })
}

export async function resumeWorkflowExecution({ executionId, context: resumeContext = {} } = {}, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  let execution = await getExecutionRow(supabase, executionId, workspaceId)

  if (execution.status !== 'paused') {
    throw createHttpError('Only paused workflow executions can be resumed.', 400)
  }

  const draft = await getWorkflowDraftById(supabase, execution.workflow_draft_id, workspaceId)
  const graph = buildGraph(draft)
  const currentNodeId = execution.current_node_id
  const currentNode = graph.nodeById.get(currentNodeId)

  if (!currentNode) {
    throw createHttpError('Paused workflow current node was not found in draft.', 400)
  }

  const mergedContext = mergeExecutionContext(execution.context || {}, resumeContext)
  execution = await updateExecution(supabase, executionId, {
    status: 'running',
    context: mergedContext,
    scheduled_resume_at: null,
    pause_reason: null,
    completed_at: null,
    error_message: null,
  }, workspaceId)

  if (currentNode.typeKey === 'wait.wait_days' || execution.pause_reason === 'scheduled_wait') {
    throw createHttpError('Scheduled waits resume through resume-due processing.', 400)
  }

  let startNodeId = currentNodeId
  const visitedNodeIds = []

  if (currentNode.typeKey === 'wait.wait_for_approval') {
    await markApprovalWaitResumed(supabase, executionId, currentNodeId)
    visitedNodeIds.push(currentNodeId)
    const outgoing = graph.outgoingByNodeId.get(currentNodeId) || []
    startNodeId = selectNextNodeId(currentNode, outgoing, mergedContext)
  }

  return runExecutionFromNode({
    supabase,
    workspaceId,
    execution,
    graph,
    startNodeId,
    visitedNodeIds,
    emailSender: context.emailSender,
  })
}

async function getActiveLeadAddedWorkflowDrafts(supabase, workspaceId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').select(workflowDraftSelect),
    workspaceId,
  )
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).filter((draft) =>
    (Array.isArray(draft.nodes) ? draft.nodes : [])
      .map(normalizeNode)
      .some((node) => node.typeKey === 'trigger.lead_added_to_campaign'),
  )
}

async function hasExistingAutoExecution(supabase, { workspaceId, workflowDraftId, leadId, campaignId }) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_executions').select('id'),
    workspaceId,
  )
    .eq('workflow_draft_id', workflowDraftId)
    .eq('lead_id', leadId)
    .eq('campaign_id', campaignId)
    .eq('context->>triggerSource', 'lead_added_to_campaign')
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return Boolean(data)
}

export async function triggerLeadAddedToCampaignWorkflows({ leadId, campaignId } = {}, context = {}) {
  if (!leadId || !campaignId) return []

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const activeDrafts = await getActiveLeadAddedWorkflowDrafts(supabase, workspaceId)
  const executions = []

  for (const draft of activeDrafts) {
    const duplicate = await hasExistingAutoExecution(supabase, {
      workspaceId,
      workflowDraftId: draft.id,
      leadId,
      campaignId,
    })

    if (duplicate) continue

    const started = await startWorkflowExecution({
      workflowDraftId: draft.id,
      leadId,
      campaignId,
      context: {
        triggerSource: 'lead_added_to_campaign',
        autoTriggered: true,
      },
    }, {
      supabase,
      workspaceId,
    })
    executions.push(await runWorkflowExecution({ executionId: started.id }, {
      supabase,
      workspaceId,
      emailSender: context.emailSender,
    }))
  }

  return executions
}

async function markScheduledWaitResumed(supabase, executionId, currentNodeId) {
  const steps = await listStepRows(supabase, executionId)
  const waitStep = [...steps]
    .reverse()
    .find((step) => step.node_id === currentNodeId && step.type_key === 'wait.wait_days' && step.status === 'paused')

  if (!waitStep) return

  await updateStep(supabase, waitStep.id, {
    status: 'completed',
    output: {
      ...(waitStep.output || {}),
      resumed: true,
      message: 'Scheduled wait completed. Workflow resumed.',
    },
    error_message: null,
    completed_at: new Date().toISOString(),
  })
}

async function resumeScheduledWaitExecution(supabase, execution, workspaceId, context = {}) {
  const draft = await getWorkflowDraftById(supabase, execution.workflow_draft_id, workspaceId)
  const graph = buildGraph(draft)
  const currentNode = graph.nodeById.get(execution.current_node_id)

  if (!currentNode) {
    throw createHttpError('Scheduled workflow current node was not found in draft.', 400)
  }

  await markScheduledWaitResumed(supabase, execution.id, currentNode.id)

  const outgoing = graph.outgoingByNodeId.get(currentNode.id) || []
  const startNodeId = selectNextNodeId(currentNode, outgoing, execution.context || {})
  const runningExecution = await updateExecution(supabase, execution.id, {
    status: 'running',
    scheduled_resume_at: null,
    pause_reason: null,
    completed_at: null,
    error_message: null,
  }, workspaceId)

  return runExecutionFromNode({
    supabase,
    workspaceId,
    execution: runningExecution,
    graph,
    startNodeId,
    visitedNodeIds: [currentNode.id],
    emailSender: context.emailSender,
  })
}

async function listDueScheduledExecutions(supabase, workspaceId, nowIso) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_executions').select(executionSelect),
    workspaceId,
  )
    .eq('status', 'paused')
    .eq('pause_reason', 'scheduled_wait')
    .lte('scheduled_resume_at', nowIso)
    .order('scheduled_resume_at', { ascending: true })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data || []
}

export async function resumeDueWorkflowExecutions(payload = {}, context = {}) {
  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const nowIso = payload.now || new Date().toISOString()
  const dueExecutions = await listDueScheduledExecutions(supabase, workspaceId, nowIso)
  const summary = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    executions: [],
  }

  for (const execution of dueExecutions) {
    summary.processed += 1

    try {
      const result = await resumeScheduledWaitExecution(supabase, execution, workspaceId, context)
      if (result.status === 'completed') summary.completed += 1
      else if (result.status === 'failed') summary.failed += 1
      else summary.skipped += 1
      summary.executions.push(result)
    } catch (error) {
      summary.failed += 1
      await updateExecution(supabase, execution.id, {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      }, workspaceId)
    }
  }

  return summary
}

export async function cancelWorkflowExecution({ executionId } = {}, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const execution = await getExecutionRow(supabase, executionId, workspaceId)

  if (!['running', 'paused'].includes(execution.status)) {
    throw createHttpError('Only running or paused workflow executions can be canceled.', 400)
  }

  const canceled = await updateExecution(supabase, executionId, {
    status: 'canceled',
    scheduled_resume_at: null,
    pause_reason: null,
    canceled_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    error_message: null,
  }, workspaceId)

  return getExecutionWithSteps(supabase, canceled.id, workspaceId)
}

function hasSentEmailStep(steps = []) {
  return steps.some((step) =>
    (step.type_key || step.typeKey) === 'action.send_approved_email'
      && step.status === 'completed'
      && step.output?.emailStatus === 'sent',
  )
}

export async function retryWorkflowExecution({ executionId } = {}, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const execution = await getExecutionRow(supabase, executionId, workspaceId)

  if (execution.status !== 'failed') {
    throw createHttpError('Only failed workflow executions can be retried.', 400)
  }

  const steps = await listStepRows(supabase, executionId)
  if (hasSentEmailStep(steps)) {
    throw createHttpError('Retry blocked because this execution already sent an email.', 409)
  }

  const draft = await getWorkflowDraftById(supabase, execution.workflow_draft_id, workspaceId)
  const graph = buildGraph(draft)
  const failedStep = [...steps].reverse().find((step) => step.status === 'failed')
  const startNodeId = execution.current_node_id || failedStep?.node_id || graph.startNode.id
  const retryExecution = await updateExecution(supabase, executionId, {
    status: 'running',
    scheduled_resume_at: null,
    pause_reason: null,
    retry_count: Number(execution.retry_count || 0) + 1,
    completed_at: null,
    error_message: null,
  }, workspaceId)

  return runExecutionFromNode({
    supabase,
    workspaceId,
    execution: retryExecution,
    graph,
    startNodeId,
    emailSender: context.emailSender,
  })
}

export async function getWorkflowExecution(executionId, context = {}) {
  if (!executionId) {
    throw createHttpError('executionId is required.')
  }

  return getExecutionWithSteps(getClient(context), executionId, getWorkspaceId(context))
}
