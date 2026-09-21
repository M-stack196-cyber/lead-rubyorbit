import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import { sendGmailMessage } from '../gmail/gmail.sender.js'
import { sendMockEmail } from '../emailSending/emailSending.mockSender.js'

const allowedDraftTypes = new Set(['primary', 'follow_up', 'followup', 'reply', 'manual'])
const allowedDraftStatuses = new Set([
  'draft',
  'saved',
  'pending_approval',
  'approved',
  'rejected',
  'sent',
])
const editableDraftStatuses = new Set(['saved', 'rejected'])

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
  error_message,
  sent_at,
  created_at,
  updated_at,
  leads (
    id,
    name,
    email,
    company
  ),
  email_accounts (
    id,
    email_address,
    provider
  )
`

const accountSelect = `
  id,
  provider,
  email_address,
  from_name,
  status,
  is_enabled,
  daily_send_limit,
  sent_today,
  last_used_at,
  gmail_email,
  gmail_token_status,
  gmail_refresh_token_encrypted,
  gmail_access_token_encrypted,
  gmail_token_expires_at
`

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

function validateRequired(value, message) {
  if (!String(value || '').trim()) {
    const error = new Error(message)
    error.statusCode = 400
    throw error
  }
}

function validateDraftType(draftType) {
  if (draftType && !allowedDraftTypes.has(draftType)) {
    const error = new Error('Invalid draft type.')
    error.statusCode = 400
    throw error
  }
}

function validateDraftStatus(status) {
  if (status && !allowedDraftStatuses.has(status)) {
    const error = new Error('Invalid draft status.')
    error.statusCode = 400
    throw error
  }
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function requireNonEmptyBody(body, message = 'Body is required.') {
  validateRequired(body, message)
}

function mapDraft(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    replyId: row.reply_id,
    sentEmailId: row.sent_email_id,
    sentEmailIdAfterSend: row.sent_email_id_after_send,
    draftType: row.type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    rejectedAt: row.rejected_at,
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
          ghlSyncStatus: row.campaign_leads.ghl_sync_status,
        }
      : null,
    reply: row.replies
      ? {
          id: row.replies.id,
          subject: row.replies.subject,
          fromEmail: row.replies.from_email,
          receivedAt: row.replies.received_at,
        }
      : null,
  }
}

const draftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  reply_id,
  sent_email_id,
  sent_email_id_after_send,
  type,
  subject,
  body,
  status,
  created_by,
  approved_by,
  approved_at,
  rejected_reason,
  rejected_at,
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
    ghl_sync_status
  ),
  replies (
    id,
    subject,
    from_email,
    received_at
  )
`

function mapSentEmail(row) {
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
    errorMessage: row.error_message,
    sentAt: row.sent_at,
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
    emailAccount: row.email_accounts
      ? {
          id: row.email_accounts.id,
          emailAddress: row.email_accounts.email_address,
          provider: row.email_accounts.provider,
        }
      : null,
  }
}

export async function listEmailDrafts() {
  const supabase = getSupabaseClient()

  const { data, error: draftsError } = await supabase
    .from('email_drafts')
    .select(draftSelect)
    .order('updated_at', { ascending: false })

  if (draftsError) {
    const error = new Error(draftsError.message)
    error.statusCode = 500
    throw error
  }

  return (data || []).map(mapDraft)
}

export async function createEmailDraft(payload = {}) {
  validateRequired(payload.campaignId, 'campaignId is required.')
  validateRequired(payload.leadId, 'leadId is required.')
  validateRequired(payload.subject, 'Subject is required.')
  validateRequired(payload.body, 'Body is required.')

  const draftType = payload.draftType || 'primary'
  validateDraftType(draftType)

  const supabase = getSupabaseClient()

  const { data, error: createError } = await supabase
    .from('email_drafts')
    .insert({
      campaign_id: payload.campaignId,
      lead_id: payload.leadId,
      campaign_lead_id: payload.campaignLeadId || null,
      reply_id: payload.replyId || null,
      sent_email_id: payload.sentEmailId || null,
      type: draftType,
      subject: String(payload.subject).trim(),
      body: String(payload.body).trim(),
      status: 'saved',
      manual_created: draftType === 'manual',
      ai_generated: false,
      created_by: null,
    })
    .select(draftSelect)
    .single()

  if (createError) {
    const error = new Error(createError.message)
    error.statusCode = createError.code === '23503' ? 400 : 500
    throw error
  }

  return mapDraft(data)
}

export async function getEmailDraftById(draftId) {
  const supabase = getSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from('email_drafts')
    .select(draftSelect)
    .eq('id', draftId)
    .single()

  if (fetchError) {
    const error = new Error(fetchError.code === 'PGRST116' ? 'Email draft not found.' : fetchError.message)
    error.statusCode = fetchError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return mapDraft(data)
}

export async function updateEmailDraft(draftId, payload = {}) {
  const currentDraft = await getEmailDraftById(draftId)

  if (!editableDraftStatuses.has(currentDraft.status)) {
    throw createHttpError('Only saved or rejected drafts can be edited.', 400)
  }

  validateDraftType(payload.draftType)
  validateDraftStatus(payload.status)

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'subject')) {
    validateRequired(payload.subject, 'Subject is required.')
    updates.subject = String(payload.subject).trim()
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'body')) {
    validateRequired(payload.body, 'Body is required.')
    updates.body = String(payload.body).trim()
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'draftType')) {
    updates.type = payload.draftType
    updates.manual_created = payload.draftType === 'manual'
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = payload.status
  }

  if (!Object.keys(updates).length) {
    const error = new Error('No email draft fields provided to update.')
    error.statusCode = 400
    throw error
  }

  const supabase = getSupabaseClient()
  const { data, error: updateError } = await supabase
    .from('email_drafts')
    .update(updates)
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (updateError) {
    const error = new Error(updateError.message)
    error.statusCode = 500
    throw error
  }

  return mapDraft(data)
}

export async function approveEmailDraft(draftId) {
  const currentDraft = await getEmailDraftById(draftId)

  if (currentDraft.status === 'sent') {
    throw createHttpError('Sent drafts cannot be approved.', 400)
  }

  if (!['saved', 'pending_approval'].includes(currentDraft.status)) {
    throw createHttpError('Only saved or pending approval drafts can be approved.', 400)
  }

  validateRequired(currentDraft.subject, 'Subject is required before approval.')
  requireNonEmptyBody(currentDraft.body, 'Email draft body is required before approval.')

  const supabase = getSupabaseClient()
  const { data, error: approveError } = await supabase
    .from('email_drafts')
    .update({
      status: 'approved',
      approved_by: null,
      approved_at: new Date().toISOString(),
      rejected_reason: null,
      rejected_at: null,
    })
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (approveError) {
    const error = new Error(approveError.message)
    error.statusCode = 500
    throw error
  }

  return mapDraft(data)
}

export async function rejectEmailDraft(draftId, rejectedReason = '') {
  const currentDraft = await getEmailDraftById(draftId)

  if (!['pending_approval', 'approved'].includes(currentDraft.status)) {
    throw createHttpError('Only pending approval or approved drafts can be rejected.', 400)
  }

  const supabase = getSupabaseClient()
  const { data, error: rejectError } = await supabase
    .from('email_drafts')
    .update({
      status: 'rejected',
      rejected_reason: String(rejectedReason || '').trim() || null,
      rejected_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null,
    })
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (rejectError) {
    const error = new Error(rejectError.message)
    error.statusCode = 500
    throw error
  }

  return mapDraft(data)
}

export async function listCampaignEmailDrafts(campaignId) {
  const supabase = getSupabaseClient()

  const { data, error: draftsError } = await supabase
    .from('email_drafts')
    .select(draftSelect)
    .eq('campaign_id', campaignId)
    .order('updated_at', { ascending: false })

  if (draftsError) {
    const error = new Error(draftsError.message)
    error.statusCode = 500
    throw error
  }

  return (data || []).map(mapDraft)
}

export async function listReplyDrafts(filters = {}) {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('email_drafts')
    .select(draftSelect)
    .eq('type', 'reply')
    .order('updated_at', { ascending: false })

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

  return (data || []).map(mapDraft)
}

export async function submitEmailDraftForApproval(draftId) {
  const currentDraft = await getEmailDraftById(draftId)

  if (!['saved', 'rejected'].includes(currentDraft.status)) {
    throw createHttpError('Only saved or rejected drafts can be submitted for approval.', 400)
  }

  validateRequired(currentDraft.subject, 'Subject is required before submitting for approval.')
  requireNonEmptyBody(currentDraft.body, 'Body is required before submitting for approval.')

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('email_drafts')
    .update({
      status: 'pending_approval',
      rejected_reason: null,
      rejected_at: null,
    })
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return mapDraft(data)
}

async function getAccountById(supabase, accountId) {
  const { data, error } = await supabase
    .from('email_accounts')
    .select(accountSelect)
    .eq('id', accountId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Email account not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getOriginalSentEmail(supabase, sentEmailId) {
  if (!sentEmailId) return null

  const { data, error } = await supabase
    .from('sent_emails')
    .select('id, email_account_id, subject')
    .eq('id', sentEmailId)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

async function getExistingSentEmailForDraft(supabase, draftId) {
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('email_draft_id', draftId)
    .eq('status', 'sent')
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

function isAccountAvailable(account) {
  return Boolean(account?.is_enabled && account.status === 'active')
}

function validateSendAccount(account) {
  if (!isAccountAvailable(account)) {
    throw createHttpError('Email account must be active and enabled before sending.', 400)
  }

  if ((account.sent_today || 0) >= account.daily_send_limit) {
    throw createHttpError('Email account daily send limit has been reached.', 400)
  }
}

function validateLiveAccount(account) {
  if (account.provider !== 'gmail') {
    throw createHttpError('Live reply sending only supports Gmail accounts in this phase.', 400)
  }

  if (account.gmail_token_status !== 'connected') {
    throw createHttpError('Gmail must be connected with Google OAuth before live sending.', 400)
  }
}

function getSendMode() {
  return env.emailSend.mode === 'live' ? 'live' : 'mock'
}

async function chooseReplySendAccount(supabase, draft, payload = {}) {
  const originalSentEmail = await getOriginalSentEmail(supabase, draft.sentEmailId)

  if (originalSentEmail?.email_account_id) {
    const originalAccount = await getAccountById(supabase, originalSentEmail.email_account_id)

    if (isAccountAvailable(originalAccount)) {
      return originalAccount
    }
  }

  if (!payload.emailAccountId) {
    throw createHttpError('emailAccountId is required when the original sending account is unavailable.', 400)
  }

  return getAccountById(supabase, payload.emailAccountId)
}

async function sendReplyThroughProvider(draft, account) {
  if (getSendMode() === 'mock') {
    return sendMockEmail({
      campaignLeadId: draft.campaignLeadId,
      leadId: draft.leadId,
    })
  }

  validateLiveAccount(account)
  return sendGmailMessage({
    account,
    draft: {
      campaign_lead_id: draft.campaignLeadId,
      lead_id: draft.leadId,
      subject: draft.subject,
      body: draft.body,
      leads: draft.lead,
    },
  })
}

export async function sendReplyDraft(draftId, payload = {}) {
  const draft = await getEmailDraftById(draftId)

  if (draft.draftType !== 'reply') {
    throw createHttpError('Only reply drafts can be sent with this endpoint.', 400)
  }

  if (draft.status !== 'approved') {
    throw createHttpError('Only approved reply drafts can be sent.', 400)
  }

  validateRequired(draft.subject, 'Subject is required before sending.')
  requireNonEmptyBody(draft.body, 'Body is required before sending.')

  if (!draft.lead?.email) {
    throw createHttpError('Lead email is required before sending a reply.', 400)
  }

  const supabase = getSupabaseClient()
  const account = await chooseReplySendAccount(supabase, draft, payload)
  validateSendAccount(account)

  const existingSentEmail = draft.sentEmailIdAfterSend
    ? { id: draft.sentEmailIdAfterSend }
    : await getExistingSentEmailForDraft(supabase, draft.id)

  if (existingSentEmail) {
    throw createHttpError('Reply draft has already been sent.', 409)
  }

  const sendResult = await sendReplyThroughProvider(draft, account)

  const { data: sentEmail, error: insertError } = await supabase
    .from('sent_emails')
    .insert({
      email_draft_id: draft.id,
      campaign_id: draft.campaignId,
      lead_id: draft.leadId,
      campaign_lead_id: draft.campaignLeadId,
      email_account_id: account.id,
      to_email: draft.lead.email,
      from_email: account.email_address,
      subject: draft.subject,
      body: draft.body,
      provider: account.provider,
      provider_message_id: sendResult.messageId,
      provider_thread_id: sendResult.threadId,
      message_id: sendResult.messageId,
      thread_id: sendResult.threadId,
      status: 'sent',
      sent_at: sendResult.sentAt,
    })
    .select(sentEmailSelect)
    .single()

  if (insertError) {
    throw createHttpError(insertError.message, insertError.code === '23505' ? 409 : 500)
  }

  const now = new Date().toISOString()
  const { error: accountUpdateError } = await supabase
    .from('email_accounts')
    .update({
      sent_today: (account.sent_today || 0) + 1,
      last_used_at: now,
    })
    .eq('id', account.id)

  if (accountUpdateError) {
    throw createHttpError(accountUpdateError.message, 500)
  }

  const { data: updatedDraft, error: draftUpdateError } = await supabase
    .from('email_drafts')
    .update({
      status: 'sent',
      sent_email_id_after_send: sentEmail.id,
    })
    .eq('id', draft.id)
    .select(draftSelect)
    .single()

  if (draftUpdateError) {
    throw createHttpError(draftUpdateError.message, 500)
  }

  return {
    draft: mapDraft(updatedDraft),
    sentEmail: mapSentEmail(sentEmail),
    sendMode: getSendMode(),
  }
}
