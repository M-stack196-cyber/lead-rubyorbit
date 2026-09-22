import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import { createNotificationIfMissing } from '../notifications/notifications.service.js'

const defaultTimeoutDays = 3
const eligibleSentEmailStatuses = new Set(['sent', 'waiting_reply'])

const sentEmailSelect = `
  id,
  email_draft_id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  email_account_id,
  to_email,
  from_email,
  subject,
  body,
  provider,
  provider_message_id,
  provider_thread_id,
  message_id,
  thread_id,
  status,
  sent_at,
  no_reply_checked_at,
  no_reply_due_at,
  no_reply_marked_at,
  reply_deadline_at,
  created_at,
  updated_at,
  leads (
    id,
    name,
    email,
    company
  ),
  campaign_leads (
    id,
    outreach_status,
    last_no_reply_checked_at,
    next_followup_due_at
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

function validateTimeoutDays(value) {
  if (value === undefined || value === null || value === '') return defaultTimeoutDays

  const timeoutDays = Number(value)

  if (!Number.isFinite(timeoutDays) || timeoutDays < 1 || timeoutDays > 30) {
    throw createHttpError('timeoutDays must be a number between 1 and 30.', 400)
  }

  return timeoutDays
}

function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * 24 * 60 * 60 * 1000)
}

function mapSentEmail(row, extra = {}) {
  return {
    id: row.id,
    emailDraftId: row.email_draft_id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    emailAccountId: row.email_account_id,
    toEmail: row.to_email,
    fromEmail: row.from_email,
    subject: row.subject,
    body: row.body,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    providerThreadId: row.provider_thread_id,
    messageId: row.message_id || row.provider_message_id,
    threadId: row.thread_id || row.provider_thread_id,
    status: row.status,
    sentAt: row.sent_at,
    noReplyCheckedAt: row.no_reply_checked_at,
    noReplyDueAt: row.no_reply_due_at,
    noReplyMarkedAt: row.no_reply_marked_at,
    replyDeadlineAt: row.reply_deadline_at,
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
    campaignLead: row.campaign_leads
      ? {
          id: row.campaign_leads.id,
          outreachStatus: row.campaign_leads.outreach_status,
          lastNoReplyCheckedAt: row.campaign_leads.last_no_reply_checked_at,
          nextFollowupDueAt: row.campaign_leads.next_followup_due_at,
        }
      : null,
    ...extra,
  }
}

function mapDecision(row) {
  if (!row) return null

  return {
    id: row.id,
    status: row.status,
    decisionType: row.decision_type || row.action,
    notes: row.notes,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

async function getSentEmailById(supabase, sentEmailId) {
  const { data, error } = await supabase
    .from('sent_emails')
    .select(sentEmailSelect)
    .eq('id', sentEmailId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Sent email not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getReplyCount(supabase, sentEmailId) {
  const { count, error } = await supabase
    .from('replies')
    .select('id', { count: 'exact', head: true })
    .eq('sent_email_id', sentEmailId)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return count || 0
}

async function getPendingNoReplyDecision(supabase, sentEmail) {
  const { data, error } = await supabase
    .from('team_decisions')
    .select('id, status, decision_type, action, notes, created_at, resolved_at')
    .eq('sent_email_id', sentEmail.id)
    .eq('status', 'pending')
    .eq('reason', 'no_reply_timeout')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data?.[0] || null
}

async function createPendingNoReplyDecision(supabase, sentEmail, timeoutDays) {
  const existing = await getPendingNoReplyDecision(supabase, sentEmail)

  if (existing) {
    return { decision: existing, created: false }
  }

  const notes = `No reply was detected after ${timeoutDays} day(s). Review manually before preparing any follow-up.`
  const { data, error } = await supabase
    .from('team_decisions')
    .insert({
      campaign_id: sentEmail.campaign_id,
      lead_id: sentEmail.lead_id,
      campaign_lead_id: sentEmail.campaign_lead_id,
      sent_email_id: sentEmail.id,
      reason: 'no_reply_timeout',
      decision_type: 'continue_later',
      action: 'continue_later',
      status: 'pending',
      notes,
      created_by: null,
    })
    .select('id, status, decision_type, action, notes, created_at, resolved_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      const duplicate = await getPendingNoReplyDecision(supabase, sentEmail)
      return { decision: duplicate, created: false }
    }

    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  return { decision: data, created: true }
}

async function safelyCreateNoReplyNotifications(sentEmail, decision = null) {
  try {
    await createNotificationIfMissing({
      type: 'no_reply_detected',
      title: 'No reply detected',
      message: sentEmail.subject
        ? `No reply was detected for sent email: ${sentEmail.subject}`
        : 'No reply was detected for a sent email.',
      priority: 'high',
      campaignId: sentEmail.campaign_id,
      leadId: sentEmail.lead_id,
      campaignLeadId: sentEmail.campaign_lead_id,
      sentEmailId: sentEmail.id,
    })

    await createNotificationIfMissing({
      type: 'followup_required',
      title: 'Follow-up required',
      message: 'This campaign lead needs follow-up review.',
      priority: 'high',
      campaignId: sentEmail.campaign_id,
      leadId: sentEmail.lead_id,
      campaignLeadId: sentEmail.campaign_lead_id,
    })

    if (decision?.id) {
      await createNotificationIfMissing({
        type: 'team_decision_pending',
        title: 'Team decision pending',
        message: 'A no-reply team decision is waiting for review.',
        priority: 'high',
        campaignId: sentEmail.campaign_id,
        leadId: sentEmail.lead_id,
        campaignLeadId: sentEmail.campaign_lead_id,
        sentEmailId: sentEmail.id,
        teamDecisionId: decision.id,
      })
    }
  } catch (error) {
    console.warn('Failed to create no-reply notification:', error.message)
  }
}

async function updateCheckedTimestamps(supabase, sentEmail, nowIso, deadlineIso) {
  const { error: sentError } = await supabase
    .from('sent_emails')
    .update({
      no_reply_checked_at: nowIso,
      no_reply_due_at: deadlineIso,
      reply_deadline_at: deadlineIso,
    })
    .eq('id', sentEmail.id)

  if (sentError) {
    throw createHttpError(sentError.message, 500)
  }

  if (sentEmail.campaign_lead_id) {
    const { error: leadError } = await supabase
      .from('campaign_leads')
      .update({ last_no_reply_checked_at: nowIso })
      .eq('id', sentEmail.campaign_lead_id)

    if (leadError) {
      throw createHttpError(leadError.message, 500)
    }
  }
}

async function markNoReply(supabase, sentEmail, timeoutDays, nowIso, deadlineIso) {
  const { error: sentError } = await supabase
    .from('sent_emails')
    .update({
      status: 'no_reply',
      no_reply_checked_at: nowIso,
      no_reply_due_at: deadlineIso,
      no_reply_marked_at: nowIso,
      reply_deadline_at: deadlineIso,
    })
    .eq('id', sentEmail.id)

  if (sentError) {
    throw createHttpError(sentError.message, 500)
  }

  if (sentEmail.campaign_lead_id) {
    const { error: leadError } = await supabase
      .from('campaign_leads')
      .update({
        outreach_status: 'followup_required',
        last_no_reply_checked_at: nowIso,
        next_followup_due_at: nowIso,
      })
      .eq('id', sentEmail.campaign_lead_id)

    if (leadError) {
      throw createHttpError(leadError.message, 500)
    }
  }

  const decisionResult = await createPendingNoReplyDecision(supabase, sentEmail, timeoutDays)
  await safelyCreateNoReplyNotifications(sentEmail, decisionResult.decision)
  const refreshed = await getSentEmailById(supabase, sentEmail.id)

  return {
    ...mapSentEmail(refreshed, {
      decision: mapDecision(decisionResult.decision),
    }),
    checked: true,
    noReplyDetected: true,
    decisionCreated: decisionResult.created,
    alreadyMarked: false,
  }
}

export async function getNoReplyMonitoringStatus() {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from('sent_emails')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'no_reply')

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return {
    defaultTimeoutDays,
    sendMode: env.emailSend.mode || 'mock',
    noReplySentEmails: count || 0,
    message: 'No-reply monitoring only marks leads for review. It does not send follow-ups automatically.',
  }
}

export async function checkSentEmailNoReply(sentEmailId, payload = {}) {
  const timeoutDays = validateTimeoutDays(payload.timeoutDays)
  const supabase = getSupabaseClient()
  const sentEmail = await getSentEmailById(supabase, sentEmailId)
  const now = new Date()
  const nowIso = now.toISOString()
  const deadline = sentEmail.sent_at ? addDays(sentEmail.sent_at, timeoutDays) : null
  const deadlineIso = deadline?.toISOString() || null

  if (sentEmail.status === 'no_reply') {
    const decision = await getPendingNoReplyDecision(supabase, sentEmail)
    return {
      ...mapSentEmail(sentEmail, { decision: mapDecision(decision) }),
      checked: true,
      noReplyDetected: false,
      alreadyMarked: true,
      decisionCreated: false,
      reason: 'already_no_reply',
    }
  }

  if (!eligibleSentEmailStatuses.has(sentEmail.status)) {
    return {
      ...mapSentEmail(sentEmail),
      checked: true,
      noReplyDetected: false,
      decisionCreated: false,
      reason: sentEmail.status === 'replied' ? 'replied' : 'ineligible_status',
    }
  }

  if (!sentEmail.sent_at) {
    return {
      ...mapSentEmail(sentEmail),
      checked: true,
      noReplyDetected: false,
      decisionCreated: false,
      reason: 'missing_sent_at',
    }
  }

  await updateCheckedTimestamps(supabase, sentEmail, nowIso, deadlineIso)

  const replyCount = await getReplyCount(supabase, sentEmail.id)

  if (replyCount > 0) {
    return {
      ...mapSentEmail(await getSentEmailById(supabase, sentEmail.id)),
      checked: true,
      noReplyDetected: false,
      decisionCreated: false,
      reason: 'reply_exists',
    }
  }

  if (now.getTime() <= deadline.getTime()) {
    return {
      ...mapSentEmail(await getSentEmailById(supabase, sentEmail.id)),
      checked: true,
      noReplyDetected: false,
      decisionCreated: false,
      reason: 'not_due',
    }
  }

  return markNoReply(supabase, sentEmail, timeoutDays, nowIso, deadlineIso)
}

export async function checkCampaignNoReplies(campaignId, payload = {}) {
  const timeoutDays = validateTimeoutDays(payload.timeoutDays)
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('campaign_id', campaignId)
    .in('status', ['sent', 'waiting_reply', 'replied', 'no_reply'])

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const summary = {
    campaignId,
    timeoutDays,
    checked: 0,
    noReplyDetected: 0,
    alreadyNoReply: 0,
    skippedBecauseReplied: 0,
    skippedBecauseNotDue: 0,
    decisionsCreated: 0,
    results: [],
  }

  for (const row of data || []) {
    const result = await checkSentEmailNoReply(row.id, { timeoutDays })
    summary.checked += 1

    if (result.noReplyDetected) summary.noReplyDetected += 1
    if (result.alreadyMarked) summary.alreadyNoReply += 1
    if (['reply_exists', 'replied'].includes(result.reason)) summary.skippedBecauseReplied += 1
    if (result.reason === 'not_due') summary.skippedBecauseNotDue += 1
    if (result.decisionCreated) summary.decisionsCreated += 1

    summary.results.push({
      sentEmailId: row.id,
      status: result.status,
      reason: result.reason || (result.noReplyDetected ? 'no_reply_detected' : 'checked'),
      noReplyDetected: result.noReplyDetected,
      alreadyMarked: result.alreadyMarked || false,
      decisionCreated: result.decisionCreated,
    })
  }

  return summary
}

export async function listCampaignNoReplies(campaignId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sent_emails')
    .select(sentEmailSelect)
    .eq('campaign_id', campaignId)
    .eq('status', 'no_reply')
    .order('no_reply_marked_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const rows = []

  for (const sentEmail of data || []) {
    const decision = await getPendingNoReplyDecision(supabase, sentEmail)
    rows.push(mapSentEmail(sentEmail, { decision: mapDecision(decision) }))
  }

  return rows
}

export async function getSentEmailNoReplyStatus(sentEmailId) {
  const supabase = getSupabaseClient()
  const sentEmail = await getSentEmailById(supabase, sentEmailId)
  const replyCount = await getReplyCount(supabase, sentEmailId)
  const decision = await getPendingNoReplyDecision(supabase, sentEmail)

  return {
    ...mapSentEmail(sentEmail, { decision: mapDecision(decision) }),
    hasReply: replyCount > 0,
    replyCount,
    eligibleForNoReplyCheck: eligibleSentEmailStatuses.has(sentEmail.status),
  }
}
