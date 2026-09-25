import { createSupabaseServiceClient } from '../../config/supabase.js'
import { scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'
import { broadcastNotification } from './notifications.realtime.js'

export const notificationTypes = new Set([
  'new_reply',
  'no_reply_detected',
  'team_decision_pending',
  'reply_draft_pending_approval',
  'followup_draft_created',
  'followup_required',
  'draft_approved',
  'system_info',
])

const notificationStatuses = new Set(['unread', 'read', 'resolved', 'archived'])
const activeStatuses = ['unread', 'read']
const notificationPriorities = new Set(['low', 'normal', 'high', 'urgent'])

const notificationSelect = `
  id,
  workspace_id,
  type,
  title,
  message,
  status,
  priority,
  campaign_id,
  lead_id,
  campaign_lead_id,
  reply_id,
  sent_email_id,
  email_draft_id,
  team_decision_id,
  metadata,
  read_at,
  resolved_at,
  created_at,
  updated_at
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

function validateType(type) {
  if (!notificationTypes.has(type)) {
    throw createHttpError('Invalid notification type.', 400)
  }
}

function validateStatus(status) {
  if (status && !notificationStatuses.has(status)) {
    throw createHttpError('Invalid notification status.', 400)
  }
}

function validatePriority(priority) {
  if (priority && !notificationPriorities.has(priority)) {
    throw createHttpError('Invalid notification priority.', 400)
  }
}

function mapNotification(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    title: row.title,
    message: row.message,
    status: row.status,
    priority: row.priority,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    replyId: row.reply_id,
    sentEmailId: row.sent_email_id,
    emailDraftId: row.email_draft_id,
    teamDecisionId: row.team_decision_id,
    metadata: row.metadata || {},
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    campaign: row.campaign || null,
    lead: row.lead || null,
    campaignName: row.campaign?.name || row.metadata?.campaignName || null,
    leadName: row.lead?.name || row.lead?.email || row.metadata?.leadName || null,
  }
}

async function enrichNotificationEntities(supabase, rows = []) {
  const campaignIds = [...new Set(rows.map((row) => row.campaign_id).filter(Boolean))]
  const leadIds = [...new Set(rows.map((row) => row.lead_id).filter(Boolean))]
  const [campaignResult, leadResult] = await Promise.all([
    campaignIds.length
      ? scopeWorkspace(
          supabase.from('campaigns').select('id, name, status').in('id', campaignIds),
        )
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? scopeWorkspace(
          supabase.from('leads').select('id, name, email, company').in('id', leadIds),
        )
      : Promise.resolve({ data: [], error: null }),
  ])

  if (campaignResult.error) {
    throw createHttpError(campaignResult.error.message, 500)
  }

  if (leadResult.error) {
    throw createHttpError(leadResult.error.message, 500)
  }

  const campaignsById = new Map((campaignResult.data || []).map((campaign) => [campaign.id, campaign]))
  const leadsById = new Map((leadResult.data || []).map((lead) => [lead.id, lead]))

  return rows.map((row) => ({
    ...row,
    campaign: campaignsById.get(row.campaign_id) || null,
    lead: leadsById.get(row.lead_id) || null,
  }))
}

function toNotificationInsert(payload = {}) {
  validateRequired(payload.type, 'type is required.')
  validateRequired(payload.title, 'title is required.')
  validateRequired(payload.message, 'message is required.')
  validateType(payload.type)
  validateStatus(payload.status)
  validatePriority(payload.priority)

  return {
    type: payload.type,
    title: String(payload.title).trim(),
    message: String(payload.message).trim(),
    status: payload.status || 'unread',
    priority: payload.priority || 'normal',
    campaign_id: payload.campaignId || null,
    lead_id: payload.leadId || null,
    campaign_lead_id: payload.campaignLeadId || null,
    reply_id: payload.replyId || null,
    sent_email_id: payload.sentEmailId || null,
    email_draft_id: payload.emailDraftId || null,
    team_decision_id: payload.teamDecisionId || null,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  }
}

function applyEntityFilters(query, payload = {}) {
  const filters = [
    ['campaign_id', payload.campaignId],
    ['lead_id', payload.leadId],
    ['campaign_lead_id', payload.campaignLeadId],
    ['reply_id', payload.replyId],
    ['sent_email_id', payload.sentEmailId],
    ['email_draft_id', payload.emailDraftId],
    ['team_decision_id', payload.teamDecisionId],
  ]

  return filters.reduce((nextQuery, [column, value]) => {
    if (value) return nextQuery.eq(column, value)
    return nextQuery.is(column, null)
  }, query)
}

async function findActiveDuplicate(supabase, payload = {}) {
  let query = scopeWorkspace(
    supabase.from('notifications').select(notificationSelect),
  )
    .eq('type', payload.type)
    .in('status', activeStatuses)
    .limit(1)

  query = applyEntityFilters(query, payload)

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data?.[0] || null
}

export async function createNotification(payload = {}) {
  const insert = toNotificationInsert(payload)
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert(withWorkspaceFields({
      ...insert,
      related_campaign_id: insert.campaign_id,
      related_lead_id: insert.lead_id,
      related_email_draft_id: insert.email_draft_id,
      related_decision_id: insert.team_decision_id,
    }))
    .select(notificationSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  const notification = mapNotification(data)
  broadcastNotification(notification)

  return notification
}

export async function createNotificationIfMissing(payload = {}) {
  const supabase = getSupabaseClient()
  const insert = toNotificationInsert(payload)
  const duplicate = await findActiveDuplicate(supabase, payload)

  if (duplicate) {
    return {
      notification: mapNotification(duplicate),
      created: false,
    }
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(withWorkspaceFields({
      ...insert,
      related_campaign_id: insert.campaign_id,
      related_lead_id: insert.lead_id,
      related_email_draft_id: insert.email_draft_id,
      related_decision_id: insert.team_decision_id,
    }))
    .select(notificationSelect)
    .single()

  if (error) {
    if (error.code === '23505') {
      const existing = await findActiveDuplicate(supabase, payload)
      if (existing) {
        return {
          notification: mapNotification(existing),
          created: false,
        }
      }
    }

    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  const notification = mapNotification(data)
  broadcastNotification(notification)

  return {
    notification,
    created: true,
  }
}

export async function listNotifications(filters = {}) {
  validateStatus(filters.status)
  if (filters.type) validateType(filters.type)
  validatePriority(filters.priority)

  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200)
  const supabase = getSupabaseClient()
  let query = scopeWorkspace(
    supabase.from('notifications').select(notificationSelect),
  )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId)

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const rows = await enrichNotificationEntities(supabase, data || [])
  return rows.map(mapNotification)
}

export async function getNotificationById(notificationId) {
  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase.from('notifications').select(notificationSelect),
  )
    .eq('id', notificationId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Notification not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  const rows = await enrichNotificationEntities(supabase, [data])
  return mapNotification(rows[0])
}

async function updateNotificationStatus(notificationId, status) {
  validateStatus(status)
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  const updates = { status }

  if (status === 'read') updates.read_at = now
  if (status === 'resolved') {
    updates.read_at = now
    updates.resolved_at = now
  }
  if (status === 'archived') {
    updates.read_at = now
    updates.resolved_at = now
  }

  const { data, error } = await scopeWorkspace(
    supabase.from('notifications').update(updates),
  )
    .eq('id', notificationId)
    .select(notificationSelect)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Notification not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return mapNotification(data)
}

export function markNotificationRead(notificationId) {
  return updateNotificationStatus(notificationId, 'read')
}

export function resolveNotification(notificationId) {
  return updateNotificationStatus(notificationId, 'resolved')
}

export function archiveNotification(notificationId) {
  return updateNotificationStatus(notificationId, 'archived')
}

async function countWithFilters(supabase, filters) {
  let query = scopeWorkspace(
    supabase.from('notifications').select('id', { count: 'exact', head: true }),
  )

  Object.entries(filters).forEach(([column, value]) => {
    if (Array.isArray(value)) {
      query = query.in(column, value)
    } else {
      query = query.eq(column, value)
    }
  })

  const { count, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return count || 0
}

export async function getNotificationSummary() {
  const supabase = getSupabaseClient()
  const [
    unread,
    highPriority,
    urgent,
    pendingTeamDecision,
    replyDraftPendingApproval,
    followupRequired,
  ] = await Promise.all([
    countWithFilters(supabase, { status: 'unread' }),
    countWithFilters(supabase, { priority: 'high', status: activeStatuses }),
    countWithFilters(supabase, { priority: 'urgent', status: activeStatuses }),
    countWithFilters(supabase, { type: 'team_decision_pending', status: activeStatuses }),
    countWithFilters(supabase, { type: 'reply_draft_pending_approval', status: activeStatuses }),
    countWithFilters(supabase, { type: 'followup_required', status: activeStatuses }),
  ])

  return {
    unread,
    highPriority,
    urgent,
    pendingTeamDecision,
    replyDraftPendingApproval,
    followupRequired,
  }
}

export async function listCampaignNotifications(campaignId, filters = {}) {
  return listNotifications({ ...filters, campaignId })
}

async function fetchRows(supabase, table, select, campaignId, buildQuery) {
  let query = scopeWorkspace(supabase.from(table).select(select)).eq('campaign_id', campaignId)
  if (buildQuery) query = buildQuery(query)

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data || []
}

function leadName(row) {
  return row.leads?.name || row.leads?.email || 'lead'
}

export async function generateCampaignNotifications(campaignId) {
  const supabase = getSupabaseClient()
  const candidates = []

  const replies = await fetchRows(
    supabase,
    'replies',
    'id, campaign_id, lead_id, campaign_lead_id, sent_email_id, subject, from_email, leads (id, name, email)',
    campaignId,
  )
  replies.forEach((reply) => {
    candidates.push({
      type: 'new_reply',
      title: `New reply from ${leadName(reply)}`,
      message: reply.subject ? `A reply was received: ${reply.subject}` : 'A reply was received.',
      priority: 'high',
      campaignId: reply.campaign_id,
      leadId: reply.lead_id,
      campaignLeadId: reply.campaign_lead_id,
      replyId: reply.id,
      sentEmailId: reply.sent_email_id,
    })
  })

  const noReplyEmails = await fetchRows(
    supabase,
    'sent_emails',
    'id, campaign_id, lead_id, campaign_lead_id, subject, no_reply_marked_at, leads (id, name, email)',
    campaignId,
    (query) => query.eq('status', 'no_reply'),
  )
  noReplyEmails.forEach((email) => {
    candidates.push({
      type: 'no_reply_detected',
      title: `No reply detected for ${leadName(email)}`,
      message: email.subject
        ? `No reply was detected for sent email: ${email.subject}`
        : 'No reply was detected for a sent email.',
      priority: 'high',
      campaignId: email.campaign_id,
      leadId: email.lead_id,
      campaignLeadId: email.campaign_lead_id,
      sentEmailId: email.id,
    })
  })

  const decisions = await fetchRows(
    supabase,
    'team_decisions',
    'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, decision_type, action, leads (id, name, email)',
    campaignId,
    (query) => query.eq('status', 'pending'),
  )
  decisions.forEach((decision) => {
    candidates.push({
      type: 'team_decision_pending',
      title: `Team decision pending for ${leadName(decision)}`,
      message: 'A team decision is waiting for review.',
      priority: 'high',
      campaignId: decision.campaign_id,
      leadId: decision.lead_id,
      campaignLeadId: decision.campaign_lead_id,
      replyId: decision.reply_id,
      sentEmailId: decision.sent_email_id,
      teamDecisionId: decision.id,
    })
  })

  const pendingDrafts = await fetchRows(
    supabase,
    'email_drafts',
    'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, type, subject, leads (id, name, email)',
    campaignId,
    (query) => query.eq('status', 'pending_approval').in('type', ['reply', 'follow_up', 'followup']),
  )
  pendingDrafts.forEach((draft) => {
    candidates.push({
      type: 'reply_draft_pending_approval',
      title: `Draft needs approval for ${leadName(draft)}`,
      message: draft.subject ? `Review pending draft: ${draft.subject}` : 'A draft is pending approval.',
      priority: draft.type === 'reply' ? 'high' : 'normal',
      campaignId: draft.campaign_id,
      leadId: draft.lead_id,
      campaignLeadId: draft.campaign_lead_id,
      replyId: draft.reply_id,
      sentEmailId: draft.sent_email_id,
      emailDraftId: draft.id,
    })
  })

  const followupDrafts = await fetchRows(
    supabase,
    'email_drafts',
    'id, campaign_id, lead_id, campaign_lead_id, source_no_reply_sent_email_id, subject, type, leads (id, name, email)',
    campaignId,
    (query) => query.in('type', ['follow_up', 'followup']).not('source_no_reply_sent_email_id', 'is', null),
  )
  followupDrafts.forEach((draft) => {
    candidates.push({
      type: 'followup_draft_created',
      title: `Follow-up draft created for ${leadName(draft)}`,
      message: draft.subject ? `Review follow-up draft: ${draft.subject}` : 'A follow-up draft was created.',
      priority: 'normal',
      campaignId: draft.campaign_id,
      leadId: draft.lead_id,
      campaignLeadId: draft.campaign_lead_id,
      sentEmailId: draft.source_no_reply_sent_email_id,
      emailDraftId: draft.id,
    })
  })

  const followupLeads = await fetchRows(
    supabase,
    'campaign_leads',
    'id, campaign_id, lead_id, outreach_status, leads (id, name, email)',
    campaignId,
    (query) => query.eq('outreach_status', 'followup_required'),
  )
  followupLeads.forEach((campaignLead) => {
    candidates.push({
      type: 'followup_required',
      title: `Follow-up required for ${leadName(campaignLead)}`,
      message: 'This campaign lead needs follow-up review.',
      priority: 'high',
      campaignId: campaignLead.campaign_id,
      leadId: campaignLead.lead_id,
      campaignLeadId: campaignLead.id,
    })
  })

  let createdCount = 0
  let existingCount = 0
  const results = []

  for (const candidate of candidates) {
    const result = await createNotificationIfMissing(candidate)
    if (result.created) createdCount += 1
    else existingCount += 1
    results.push({
      type: candidate.type,
      notificationId: result.notification.id,
      created: result.created,
    })
  }

  return {
    campaignId,
    scannedCount: candidates.length,
    existingCount,
    createdCount,
    results,
  }
}
