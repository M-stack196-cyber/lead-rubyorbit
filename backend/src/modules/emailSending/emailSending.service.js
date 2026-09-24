import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import { scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'
import { sendGmailMessage } from '../gmail/gmail.sender.js'
import { sendSmtpMessage } from '../smtp/smtp.sender.js'
import { sendMockEmail } from './emailSending.mockSender.js'

const draftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  type,
  subject,
  body,
  status,
  leads (
    id,
    name,
    email,
    company
  ),
  campaign_leads (
    id,
    outreach_status
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
  gmail_token_expires_at,
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  smtp_secret_encrypted
`

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
  campaigns (
    id,
    name
  ),
  email_accounts (
    id,
    email_address,
    provider
  )
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

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

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
    campaign: row.campaigns
      ? {
          id: row.campaigns.id,
          name: row.campaigns.name,
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

export function getEmailSendingStatus() {
  const requestedMode = env.emailSend.mode || 'mock'
  const isLive = requestedMode === 'live' && env.emailSend.liveApproved

  return {
    mode: isLive ? 'live' : 'mock',
    requestedMode,
    realSendingEnabled: isLive,
    liveApproved: env.emailSend.liveApproved,
    message: isLive
      ? 'Live sending mode active. Connected Gmail and configured SMTP accounts can send real emails.'
      : requestedMode === 'live'
        ? 'Live mode was requested but EMAIL_SEND_LIVE_APPROVED is not true. No real emails are sent.'
        : 'Mock sending mode active. No real emails are sent.',
  }
}

async function getDraftById(supabase, draftId) {
  const { data, error: draftError } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
    .eq('id', draftId)
    .single()

  if (draftError) {
    throw createHttpError(
      draftError.code === 'PGRST116' ? 'Email draft not found.' : draftError.message,
      draftError.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getEmailAccountById(supabase, emailAccountId) {
  if (!emailAccountId) {
    throw createHttpError('emailAccountId is required.', 400)
  }

  const { data, error: accountError } = await scopeWorkspace(
    supabase.from('email_accounts').select(accountSelect),
  )
    .eq('id', emailAccountId)
    .single()

  if (accountError) {
    throw createHttpError(
      accountError.code === 'PGRST116' ? 'Email account not found.' : accountError.message,
      accountError.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getExistingSentEmail(supabase, draftId) {
  const { data, error: sentError } = await scopeWorkspace(
    supabase.from('sent_emails').select('id'),
  )
    .eq('email_draft_id', draftId)
    .eq('status', 'sent')
    .maybeSingle()

  if (sentError) {
    throw createHttpError(sentError.message, 500)
  }

  return data
}

function validateDraft(draft) {
  if (draft.status !== 'approved') {
    throw createHttpError('Only approved email drafts can be sent.', 400)
  }

  if (!String(draft.subject || '').trim() || !String(draft.body || '').trim()) {
    throw createHttpError('Email draft subject and body are required before sending.', 400)
  }

  if (!draft.leads?.email) {
    throw createHttpError('Lead email is required before sending.', 400)
  }
}

function validateEmailAccount(account) {
  if (!account.is_enabled || account.status !== 'active') {
    throw createHttpError('Email account must be active and enabled before sending.', 400)
  }

  if ((account.sent_today || 0) >= account.daily_send_limit) {
    throw createHttpError('Email account daily send limit has been reached.', 400)
  }
}

async function reserveSendSlot(supabase, account) {
  validateEmailAccount(account)

  // TODO: Production live sending needs a DB RPC/transaction or compensation that
  // releases this reservation if the provider send or sent_emails insert fails.
  const currentSentToday = account.sent_today || 0
  const nextSentToday = currentSentToday + 1
  const now = new Date().toISOString()

  const { data, error } = await scopeWorkspace(
    supabase.from('email_accounts').update({
      sent_today: nextSentToday,
      last_used_at: now,
    }),
  )
    .eq('id', account.id)
    .eq('sent_today', currentSentToday)
    .lt('sent_today', account.daily_send_limit)
    .select('id, sent_today, last_used_at')
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  if (!data) {
    throw createHttpError(
      'Email account send limit changed before this send could be reserved. Please retry.',
      409,
    )
  }

  account.sent_today = data.sent_today
  account.last_used_at = data.last_used_at

  return {
    reservedSentToday: data.sent_today,
    previousSentToday: currentSentToday,
  }
}

function getSendMode() {
  return env.emailSend.mode === 'live' && env.emailSend.liveApproved ? 'live' : 'mock'
}

async function releaseSendSlot(supabase, account, reservation) {
  if (!reservation) return

  const { data, error } = await scopeWorkspace(
    supabase.from('email_accounts').update({
      sent_today: reservation.previousSentToday,
    }),
  )
    .eq('id', account.id)
    .eq('sent_today', reservation.reservedSentToday)
    .select('id, sent_today')
    .maybeSingle()

  if (error) {
    console.warn('Failed to release email send reservation:', error.message)
    return
  }

  if (data) {
    account.sent_today = data.sent_today
  }
}

function validateLiveEmailAccount(account) {
  if (account.provider === 'gmail' && account.gmail_token_status !== 'connected') {
    throw createHttpError('Gmail must be connected with Google OAuth before live sending.', 400)
  }

  if (account.provider === 'smtp') {
    if (!account.smtp_host || !account.smtp_port || !account.smtp_secret_encrypted) {
      throw createHttpError('SMTP account must include host, port, and password before live sending.', 400)
    }
    return
  }

  if (account.provider !== 'gmail') {
    throw createHttpError('Live email sending supports Gmail and SMTP accounts only.', 400)
  }
}

async function sendDraftThroughProvider(draft, account) {
  if (getSendMode() === 'mock') {
    return sendMockEmail({
      campaignLeadId: draft.campaign_lead_id,
      leadId: draft.lead_id,
    })
  }

  validateLiveEmailAccount(account)
  if (account.provider === 'smtp') {
    return sendSmtpMessage({ account, draft })
  }

  return sendGmailMessage({ account, draft })
}

async function sendDraftWithClient(supabase, draft, account) {
  validateDraft(draft)

  const existingSentEmail = await getExistingSentEmail(supabase, draft.id)

  if (existingSentEmail) {
    throw createHttpError('Email draft has already been sent.', 409)
  }

  const reservation = await reserveSendSlot(supabase, account)
  let providerSendSucceeded = false
  let sendResult

  try {
    sendResult = await sendDraftThroughProvider(draft, account)
    providerSendSucceeded = getSendMode() === 'live'
  } catch (error) {
    await releaseSendSlot(supabase, account, reservation)
    throw error
  }

  const { data, error: insertError } = await supabase
    .from('sent_emails')
    .insert(withWorkspaceFields({
      email_draft_id: draft.id,
      campaign_id: draft.campaign_id,
      lead_id: draft.lead_id,
      campaign_lead_id: draft.campaign_lead_id,
      email_account_id: account.id,
      to_email: draft.leads.email,
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
    }))
    .select(sentEmailSelect)
    .single()

  if (insertError) {
    if (!providerSendSucceeded) {
      await releaseSendSlot(supabase, account, reservation)
    }
    throw createHttpError(insertError.message, insertError.code === '23505' ? 409 : 500)
  }

  const { error: draftUpdateError } = await scopeWorkspace(
    supabase.from('email_drafts').update({ status: 'sent' }),
  )
    .eq('id', draft.id)

  if (draftUpdateError) {
    if (!providerSendSucceeded) {
      await releaseSendSlot(supabase, account, reservation)
    }
    throw createHttpError(draftUpdateError.message, 500)
  }

  return mapSentEmail(data)
}

export async function sendEmailDraft(draftId, payload = {}) {
  const supabase = getSupabaseClient()
  const [draft, account] = await Promise.all([
    getDraftById(supabase, draftId),
    getEmailAccountById(supabase, payload.emailAccountId),
  ])

  return sendDraftWithClient(supabase, draft, account)
}

export async function sendCampaignEmails(campaignId, payload = {}) {
  const supabase = getSupabaseClient()
  const account = await getEmailAccountById(supabase, payload.emailAccountId)

  const { data, error: draftsError } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
    .eq('campaign_id', campaignId)
    .eq('status', 'approved')
    .order('updated_at', { ascending: true })

  if (draftsError) {
    throw createHttpError(draftsError.message, 500)
  }

  const summary = {
    totalApprovedDrafts: data?.length || 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    blocked: 0,
    results: [],
  }

  for (const draft of data || []) {
    try {
      const existingSentEmail = await getExistingSentEmail(supabase, draft.id)

      if (existingSentEmail) {
        summary.skipped += 1
        summary.results.push({ draftId: draft.id, status: 'skipped', message: 'Already sent.' })
        continue
      }

      const sentEmail = await sendDraftWithClient(supabase, draft, account)
      summary.sent += 1
      summary.results.push({ draftId: draft.id, status: 'sent', sentEmail })
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        summary.blocked += 1
        summary.results.push({ draftId: draft.id, status: 'blocked', message: error.message })
      } else {
        summary.failed += 1
        summary.results.push({ draftId: draft.id, status: 'failed', message: error.message })
      }
    }
  }

  return summary
}

export async function listCampaignSentEmails(campaignId) {
  const supabase = getSupabaseClient()

  const { data, error: sentEmailError } = await scopeWorkspace(
    supabase.from('sent_emails').select(sentEmailSelect),
  )
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false })

  if (sentEmailError) {
    throw createHttpError(sentEmailError.message, 500)
  }

  return (data || []).map(mapSentEmail)
}
