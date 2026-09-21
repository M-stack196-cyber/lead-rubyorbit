import { createSupabaseServiceClient } from '../../config/supabase.js'

const allowedDecisionTypes = new Set([
  'stop_outreach',
  'manual_handling',
  'create_reply_draft',
  'mark_qualified',
  'continue_later',
])

const allowedStatuses = new Set(['pending', 'completed', 'cancelled'])

const decisionSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  reply_id,
  sent_email_id,
  decision_type,
  action,
  status,
  notes,
  assigned_to,
  resolved_at,
  created_by,
  created_at,
  updated_at,
  leads (
    id,
    name,
    email,
    company
  ),
  replies (
    id,
    subject,
    body_preview,
    from_email,
    received_at
  ),
  sent_emails (
    id,
    subject,
    status,
    sent_at
  ),
  campaign_leads (
    id,
    outreach_status
  )
`

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  return supabase
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function validateRequired(value, message) {
  if (!String(value || '').trim()) {
    throw createHttpError(message, 400)
  }
}

function validateDecisionType(decisionType) {
  if (decisionType && !allowedDecisionTypes.has(decisionType)) {
    throw createHttpError('Invalid decision type.', 400)
  }
}

function validateStatus(status) {
  if (status && !allowedStatuses.has(status)) {
    throw createHttpError('Invalid decision status.', 400)
  }
}

function mapDecision(row, extra = {}) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    replyId: row.reply_id,
    sentEmailId: row.sent_email_id,
    decisionType: row.decision_type || row.action,
    status: row.status,
    notes: row.notes,
    assignedTo: row.assigned_to,
    resolvedAt: row.resolved_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lead: row.leads
      ? {
          id: row.leads.id,
          name: row.leads.name,
          email: row.leads.email,
          company: row.leads.company,
        }
      : null,
    reply: row.replies
      ? {
          id: row.replies.id,
          subject: row.replies.subject,
          bodyPreview: row.replies.body_preview,
          fromEmail: row.replies.from_email,
          receivedAt: row.replies.received_at,
        }
      : null,
    sentEmail: row.sent_emails
      ? {
          id: row.sent_emails.id,
          subject: row.sent_emails.subject,
          status: row.sent_emails.status,
          sentAt: row.sent_emails.sent_at,
        }
      : null,
    campaignLead: row.campaign_leads
      ? {
          id: row.campaign_leads.id,
          outreachStatus: row.campaign_leads.outreach_status,
        }
      : null,
    ...extra,
  }
}

function toDecisionInsert(payload = {}) {
  validateRequired(payload.campaignId, 'campaignId is required.')
  validateRequired(payload.leadId, 'leadId is required.')

  const decisionType = payload.decisionType || 'manual_handling'
  validateDecisionType(decisionType)

  return {
    campaign_id: payload.campaignId,
    lead_id: payload.leadId,
    campaign_lead_id: payload.campaignLeadId || null,
    reply_id: payload.replyId || null,
    sent_email_id: payload.sentEmailId || null,
    reason: payload.replyId ? 'lead_replied' : 'manual_review',
    decision_type: decisionType,
    action: decisionType,
    status: 'pending',
    notes: String(payload.notes || '').trim() || null,
    created_by: payload.createdBy || null,
    assigned_to: payload.assignedTo || null,
  }
}

async function getDecisionRowById(supabase, decisionId) {
  const { data, error } = await supabase
    .from('team_decisions')
    .select(decisionSelect)
    .eq('id', decisionId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Team decision not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getReplyById(supabase, replyId) {
  const { data, error } = await supabase
    .from('replies')
    .select(
      `
        id,
        sent_email_id,
        campaign_id,
        lead_id,
        campaign_lead_id,
        subject,
        sent_emails (
          id,
          subject
        )
      `,
    )
    .eq('id', replyId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Reply not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function createReplyDraft(supabase, decision) {
  const reply = decision.reply_id ? await getReplyById(supabase, decision.reply_id) : null
  const originalSubject = reply?.subject || reply?.sent_emails?.subject || decision.sent_emails?.subject || ''
  const normalizedSubject = originalSubject.trim()
  const subject = normalizedSubject.toLowerCase().startsWith('re:')
    ? normalizedSubject
    : `Re: ${normalizedSubject || 'Reply'}`

  const { data, error } = await supabase
    .from('email_drafts')
    .insert({
      campaign_id: decision.campaign_id,
      lead_id: decision.lead_id,
      campaign_lead_id: decision.campaign_lead_id,
      reply_id: decision.reply_id,
      sent_email_id: decision.sent_email_id,
      type: 'reply',
      subject,
      body: 'Write your reply here...',
      status: 'saved',
      ai_generated: false,
      manual_created: true,
      created_by: null,
    })
    .select('id, campaign_id, lead_id, campaign_lead_id, type, subject, body, status, created_at, updated_at')
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  return {
    id: data.id,
    campaignId: data.campaign_id,
    leadId: data.lead_id,
    campaignLeadId: data.campaign_lead_id,
    draftType: data.type,
    subject: data.subject,
    body: data.body,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

function outreachStatusForDecision(decisionType) {
  const statuses = {
    stop_outreach: 'stopped',
    manual_handling: 'paused',
    create_reply_draft: 'paused',
    mark_qualified: 'qualified',
    continue_later: 'paused',
  }

  return statuses[decisionType] || 'paused'
}

export async function listTeamDecisions(filters = {}) {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('team_decisions')
    .select(decisionSelect)
    .order('created_at', { ascending: false })

  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId)
  }

  if (filters.replyId) {
    query = query.eq('reply_id', filters.replyId)
  }

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map((row) => mapDecision(row))
}

export async function getTeamDecisionById(decisionId) {
  const supabase = getSupabaseClient()
  const row = await getDecisionRowById(supabase, decisionId)

  return mapDecision(row)
}

export async function createTeamDecision(payload = {}) {
  const supabase = getSupabaseClient()
  const insert = toDecisionInsert(payload)

  if (insert.reply_id) {
    const existing = await findPendingDecisionForReply(supabase, insert.reply_id)
    if (existing) return mapDecision(existing)
  }

  const { data, error } = await supabase
    .from('team_decisions')
    .insert(insert)
    .select(decisionSelect)
    .single()

  if (error) {
    if (error.code === '23505' && insert.reply_id) {
      const existing = await findPendingDecisionForReply(supabase, insert.reply_id)
      if (existing) return mapDecision(existing)
    }

    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  return mapDecision(data)
}

export async function updateTeamDecision(decisionId, payload = {}) {
  validateDecisionType(payload.decisionType)
  validateStatus(payload.status)

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'decisionType')) {
    updates.decision_type = payload.decisionType
    updates.action = payload.decisionType
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = payload.status
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    updates.notes = String(payload.notes || '').trim() || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'assignedTo')) {
    updates.assigned_to = payload.assignedTo || null
  }

  if (!Object.keys(updates).length) {
    throw createHttpError('No team decision fields provided to update.', 400)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('team_decisions')
    .update(updates)
    .eq('id', decisionId)
    .select(decisionSelect)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Team decision not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return mapDecision(data)
}

export async function completeTeamDecision(decisionId, payload = {}) {
  const supabase = getSupabaseClient()
  const current = await getDecisionRowById(supabase, decisionId)
  const decisionType = payload.decisionType || current.decision_type || current.action
  validateDecisionType(decisionType)

  let createdDraft = null

  if (decisionType === 'create_reply_draft') {
    createdDraft = await createReplyDraft(supabase, current)
  }

  const { data, error } = await supabase
    .from('team_decisions')
    .update({
      decision_type: decisionType,
      action: decisionType,
      status: 'completed',
      notes: Object.prototype.hasOwnProperty.call(payload, 'notes')
        ? String(payload.notes || '').trim() || null
        : current.notes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', decisionId)
    .select(decisionSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  if (current.campaign_lead_id) {
    const { error: leadError } = await supabase
      .from('campaign_leads')
      .update({ outreach_status: outreachStatusForDecision(decisionType) })
      .eq('id', current.campaign_lead_id)

    if (leadError) {
      throw createHttpError(leadError.message, 500)
    }
  }

  const refreshed = await getDecisionRowById(supabase, decisionId)

  return mapDecision(refreshed, {
    createdDraft,
    message:
      decisionType === 'create_reply_draft'
        ? 'Team decision completed and a reply draft was created. No email was sent.'
        : 'Team decision completed.',
  })
}

export async function cancelTeamDecision(decisionId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('team_decisions')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', decisionId)
    .select(decisionSelect)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Team decision not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return mapDecision(data)
}

async function findPendingDecisionForReply(supabase, replyId) {
  const { data, error } = await supabase
    .from('team_decisions')
    .select(decisionSelect)
    .eq('reply_id', replyId)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

export async function createPendingDecisionForReply(replyId) {
  const supabase = getSupabaseClient()
  const reply = await getReplyById(supabase, replyId)

  return createTeamDecision({
    campaignId: reply.campaign_id,
    leadId: reply.lead_id,
    campaignLeadId: reply.campaign_lead_id,
    replyId: reply.id,
    sentEmailId: reply.sent_email_id,
    decisionType: 'manual_handling',
  })
}
