import { createSupabaseServiceClient } from '../../config/supabase.js'
import { getGoogleOAuthScopes } from '../gmail/gmail.oauthClient.js'
import { createNotificationIfMissing } from '../notifications/notifications.service.js'
import { createPendingDecisionForReply } from '../teamDecisions/teamDecisions.service.js'
import { isReplyFromOtherSender, readGmailThread } from './replyMonitoring.gmailReader.js'

const sentEmailSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  email_account_id,
  to_email,
  from_email,
  subject,
  message_id,
  thread_id,
  provider_message_id,
  provider_thread_id,
  status
`

const accountSelect = `
  id,
  provider,
  email_address,
  gmail_email,
  gmail_token_status,
  gmail_refresh_token_encrypted,
  gmail_access_token_encrypted,
  gmail_token_expires_at,
  gmail_scope
`

const replySelect = `
  id,
  sent_email_id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  email_account_id,
  gmail_message_id,
  gmail_thread_id,
  from_email,
  to_email,
  subject,
  body_preview,
  received_at,
  created_at,
  updated_at,
  leads (
    id,
    name,
    email,
    company
  ),
  sent_emails (
    id,
    status
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

function getReadonlyAvailable(scopes = getGoogleOAuthScopes()) {
  return scopes.includes('https://www.googleapis.com/auth/gmail.readonly')
}

function mapReply(row) {
  return {
    id: row.id,
    sentEmailId: row.sent_email_id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    emailAccountId: row.email_account_id,
    gmailMessageId: row.gmail_message_id,
    gmailThreadId: row.gmail_thread_id,
    fromEmail: row.from_email,
    toEmail: row.to_email,
    subject: row.subject,
    bodyPreview: row.body_preview,
    receivedAt: row.received_at,
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
    sentEmail: row.sent_emails
      ? {
          id: row.sent_emails.id,
          status: row.sent_emails.status,
        }
      : null,
  }
}

async function safelyCreateNewReplyNotification(reply) {
  try {
    await createNotificationIfMissing({
      type: 'new_reply',
      title: 'New reply received',
      message: reply.subject ? `A reply was received: ${reply.subject}` : 'A reply was received.',
      priority: 'high',
      campaignId: reply.campaign_id,
      leadId: reply.lead_id,
      campaignLeadId: reply.campaign_lead_id,
      replyId: reply.id,
      sentEmailId: reply.sent_email_id,
    })
  } catch (error) {
    console.warn('Failed to create new reply notification:', error.message)
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

async function getEmailAccountById(supabase, emailAccountId) {
  const { data, error } = await supabase
    .from('email_accounts')
    .select(accountSelect)
    .eq('id', emailAccountId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Email account not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function updateSafeGmailError(supabase, accountId, message) {
  await supabase
    .from('email_accounts')
    .update({
      gmail_token_status: 'error',
      gmail_last_error: String(message || 'Gmail API request failed.').slice(0, 500),
    })
    .eq('id', accountId)
}

export async function getReplyMonitoringStatus() {
  const supabase = getSupabaseClient()
  const scopes = getGoogleOAuthScopes()
  const { count, error } = await supabase
    .from('email_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'gmail')
    .eq('gmail_token_status', 'connected')

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return {
    gmailReadonlyAvailable: getReadonlyAvailable(scopes),
    connectedGmailAccounts: count || 0,
    message: 'Reply monitoring is manual in this phase. No automatic follow-ups are sent.',
  }
}

export async function checkSentEmailReplies(sentEmailId) {
  const supabase = getSupabaseClient()
  const sentEmail = await getSentEmailById(supabase, sentEmailId)
  const account = await getEmailAccountById(supabase, sentEmail.email_account_id)

  if (account.provider !== 'gmail') {
    throw createHttpError('Reply monitoring only supports Gmail email accounts in this phase.', 400)
  }

  if (account.gmail_token_status !== 'connected') {
    throw createHttpError('Gmail account is not connected. Reconnect Gmail OAuth.', 400)
  }

  const accountScopes = String(account.gmail_scope || '')
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean)

  if (!getReadonlyAvailable(accountScopes.length ? accountScopes : undefined)) {
    throw createHttpError('Gmail readonly scope is required before checking replies.', 400)
  }

  const originalMessageId = sentEmail.message_id || sentEmail.provider_message_id
  const threadId = sentEmail.thread_id || sentEmail.provider_thread_id

  if (!originalMessageId) {
    throw createHttpError('Sent email is missing the Gmail message id.', 400)
  }

  if (!threadId) {
    throw createHttpError('Sent email is missing the Gmail thread id.', 400)
  }

  let thread

  try {
    thread = await readGmailThread({ account, supabase, threadId })
  } catch (error) {
    await updateSafeGmailError(supabase, account.id, error.message)
    throw createHttpError('Gmail API request failed while checking replies.', error.statusCode || 502)
  }

  const candidateReplies = thread.messages.filter(
    (message) =>
      message.gmailMessageId !== originalMessageId && isReplyFromOtherSender(message, account),
  )

  if (!candidateReplies.length) {
    return {
      checked: true,
      repliesFound: 0,
      newRepliesSaved: 0,
      alreadyExisting: 0,
    }
  }

  const gmailMessageIds = candidateReplies.map((message) => message.gmailMessageId)
  const { data: existingReplies, error: existingError } = await supabase
    .from('replies')
    .select('gmail_message_id')
    .in('gmail_message_id', gmailMessageIds)

  if (existingError) {
    throw createHttpError(existingError.message, 500)
  }

  const existingMessageIds = new Set((existingReplies || []).map((reply) => reply.gmail_message_id))
  const newReplies = candidateReplies.filter(
    (message) => !existingMessageIds.has(message.gmailMessageId),
  )

  if (newReplies.length) {
    const rows = newReplies.map((message) => ({
      sent_email_id: sentEmail.id,
      campaign_id: sentEmail.campaign_id,
      lead_id: sentEmail.lead_id,
      campaign_lead_id: sentEmail.campaign_lead_id,
      email_account_id: account.id,
      gmail_message_id: message.gmailMessageId,
      gmail_thread_id: message.gmailThreadId,
      from_email: message.fromEmail,
      to_email: message.toEmail,
      subject: message.subject || sentEmail.subject,
      body: message.bodyPreview,
      body_preview: message.bodyPreview,
      provider_message_id: message.gmailMessageId,
      provider_thread_id: message.gmailThreadId,
      received_at: message.receivedAt,
      raw_payload: message.rawPayload,
    }))

    const { data: insertedReplies, error: insertError } = await supabase
      .from('replies')
      .insert(rows)
      .select('id, sent_email_id, campaign_id, lead_id, campaign_lead_id, subject')

    if (insertError && insertError.code !== '23505') {
      throw createHttpError(insertError.message, 500)
    }

    for (const reply of insertedReplies || []) {
      await safelyCreateNewReplyNotification(reply)
      await createPendingDecisionForReply(reply.id)
    }
  }

  if (candidateReplies.length) {
    const now = new Date().toISOString()
    const { error: sentEmailUpdateError } = await supabase
      .from('sent_emails')
      .update({ status: 'replied' })
      .eq('id', sentEmail.id)

    if (sentEmailUpdateError) {
      throw createHttpError(sentEmailUpdateError.message, 500)
    }

    if (sentEmail.campaign_lead_id) {
      const { error: campaignLeadUpdateError } = await supabase
        .from('campaign_leads')
        .update({
          outreach_status: 'replied',
          reply_detected_at: now,
        })
        .eq('id', sentEmail.campaign_lead_id)

      if (campaignLeadUpdateError) {
        throw createHttpError(campaignLeadUpdateError.message, 500)
      }
    }
  }

  return {
    checked: true,
    repliesFound: candidateReplies.length,
    newRepliesSaved: newReplies.length,
    alreadyExisting: candidateReplies.length - newReplies.length,
  }
}

export async function checkCampaignReplies(campaignId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('campaign_id', campaignId)
    .in('status', ['sent', 'waiting_reply'])

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const summary = {
    totalSentEmails: data?.length || 0,
    checked: 0,
    replied: 0,
    newRepliesSaved: 0,
    failed: 0,
    results: [],
  }

  for (const row of data || []) {
    try {
      const result = await checkSentEmailReplies(row.id)
      summary.checked += 1
      summary.newRepliesSaved += result.newRepliesSaved

      if (result.repliesFound > 0) {
        summary.replied += 1
      }

      summary.results.push({ sentEmailId: row.id, status: 'checked', ...result })
    } catch (error) {
      summary.failed += 1
      summary.results.push({
        sentEmailId: row.id,
        status: 'failed',
        message: error.message,
      })
    }
  }

  return summary
}

export async function listCampaignReplies(campaignId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('replies')
    .select(replySelect)
    .eq('campaign_id', campaignId)
    .order('received_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map(mapReply)
}

export async function listSentEmailReplies(sentEmailId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('replies')
    .select(replySelect)
    .eq('sent_email_id', sentEmailId)
    .order('received_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map(mapReply)
}
