import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import { sendGmailMessage } from '../gmail/gmail.sender.js'
import { sendSmtpMessage } from '../smtp/smtp.sender.js'
import { sendMockEmail } from '../emailSending/emailSending.mockSender.js'
import { createNotificationIfMissing } from '../notifications/notifications.service.js'
import { scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'

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
  gmail_token_expires_at,
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  smtp_secret_encrypted
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
  const leadName = row.leads?.name || row.leads?.email || null

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
    aiGenerated: row.ai_generated,
    createdBy: row.created_by,
    aiModel: row.ai_model,
    aiPrompt: row.ai_prompt,
    aiTone: row.ai_tone,
    aiGenerationType: row.ai_generation_type,
    aiSource: row.ai_source || {},
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    leadName,
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
  ai_generated,
  ai_model,
  ai_prompt,
  ai_tone,
  ai_generation_type,
  ai_source,
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
  campaign_leads!email_drafts_campaign_lead_id_fkey (
    id,
    outreach_status,
    ghl_sync_status
  ),
  replies (
    id,
    subject,
    from_email,
    body_preview,
    received_at
  )
`

const campaignLeadAiSelect = `
  id,
  campaign_id,
  lead_id,
  outreach_status,
  campaigns (
    id,
    name,
    description
  ),
  leads (
    id,
    name,
    email,
    company,
    website,
    linkedin_url,
    location,
    source,
    tags,
    score
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

async function safelyCreateDraftNotification(draft, type) {
  try {
    const isFollowup = ['follow_up', 'followup'].includes(draft.draftType || draft.type)
    await createNotificationIfMissing({
      type,
      title:
        type === 'draft_approved'
          ? 'Draft approved'
          : isFollowup
            ? 'Follow-up draft needs approval'
            : 'Reply draft needs approval',
      message: draft.subject
        ? `Review draft: ${draft.subject}`
        : type === 'draft_approved'
          ? 'An email draft was approved.'
          : 'An email draft is pending approval.',
      priority: type === 'draft_approved' ? 'normal' : 'high',
      campaignId: draft.campaignId || draft.campaign_id,
      leadId: draft.leadId || draft.lead_id,
      campaignLeadId: draft.campaignLeadId || draft.campaign_lead_id,
      replyId: draft.replyId || draft.reply_id,
      sentEmailId: draft.sentEmailId || draft.sent_email_id,
      emailDraftId: draft.id,
    })
  } catch (error) {
    console.warn('Failed to create draft notification:', error.message)
  }
}

export async function listEmailDrafts() {
  const supabase = getSupabaseClient()

  const { data, error: draftsError } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
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
    .insert(withWorkspaceFields({
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
    }))
    .select(draftSelect)
    .single()

  if (createError) {
    const error = new Error(createError.message)
    error.statusCode = createError.code === '23503' ? 400 : 500
    throw error
  }

  const mappedDraft = mapDraft(data)
  await safelyCreateDraftNotification(mappedDraft, 'draft_approved')

  return mappedDraft
}

function firstName(name = '') {
  return String(name || '').trim().split(/\s+/)[0] || 'there'
}

function buildAiDraftCopy({ campaign, lead, payload = {} }) {
  const tone = String(payload.tone || 'professional').trim().toLowerCase()
  const goal = String(payload.goal || campaign?.description || 'start a useful conversation').trim()
  const callToAction = String(payload.callToAction || 'Would you be open to a quick conversation this week?').trim()
  const companyPhrase = lead.company ? `at ${lead.company}` : 'on your team'
  const subjectCompany = lead.company || campaign?.name || 'your team'
  const subject = payload.subject || `Quick idea for ${subjectCompany}`
  const opener =
    tone === 'friendly'
      ? `Hi ${firstName(lead.name)},`
      : `Hello ${firstName(lead.name)},`
  const context = lead.company
    ? `I noticed ${lead.company} and wanted to reach out with a focused idea.`
    : 'I wanted to reach out with a focused idea.'
  const scoreLine = Number.isFinite(Number(lead.score)) && Number(lead.score) > 0
    ? `I marked this as a strong-fit lead based on the available profile signals.`
    : ''

  return {
    subject,
    body: [
      opener,
      '',
      context,
      `For ${companyPhrase}, the goal is simple: ${goal}.`,
      scoreLine,
      '',
      callToAction,
      '',
      'Best,',
      '{{senderName}}',
    ].filter((line) => line !== '').join('\n'),
  }
}

function buildAiMetadata({ generationType, tone, prompt, source = {}, model = 'lead-rubyorbit-template-v1' }) {
  return {
    ai_model: model,
    ai_prompt: String(prompt || '').trim() || null,
    ai_tone: String(tone || 'professional').trim().toLowerCase(),
    ai_generation_type: generationType,
    ai_source: source,
  }
}

function normalizeReplySubject(subject = '') {
  const value = String(subject || '').trim()
  return value.toLowerCase().startsWith('re:') ? value : `Re: ${value || 'Reply'}`
}

function improveSubject(subject = '', fallback = 'Quick follow up') {
  const raw = String(subject || fallback).replace(/\s+/g, ' ').trim()
  const withoutSpam = raw.replace(/\b(urgent|free|guaranteed|act now)\b/gi, '').replace(/\s{2,}/g, ' ').trim()
  return withoutSpam || fallback
}

function improveBodyGrammar(body = '') {
  return String(body || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\bi\b/g, 'I')
    .trim()
}

function buildAiReplyCopy({ reply, payload = {} }) {
  const tone = String(payload.tone || 'professional').trim().toLowerCase()
  const subject = improveSubject(payload.subject || normalizeReplySubject(reply.subject || reply.sent_emails?.subject))
  const preview = String(reply.body_preview || '').trim()
  const opener = tone === 'friendly' ? 'Hi there,' : 'Hello,'
  const intentLine = payload.intent
    ? `Thanks for the note. Based on your message, I want to respond around: ${payload.intent}.`
    : 'Thanks for the note. I appreciate you getting back to me.'

  return {
    subject,
    body: [
      opener,
      '',
      intentLine,
      preview ? `I saw your point about "${preview.slice(0, 160)}".` : '',
      'A helpful next step would be to confirm priorities and decide whether a short conversation makes sense.',
      '',
      'Best,',
      '{{senderName}}',
    ].filter(Boolean).join('\n'),
    prompt: `Generate ${tone} reply draft for reply ${reply.id}. Intent: ${payload.intent || 'continue conversation'}.`,
    tone,
  }
}

async function getCampaignLeadForAiDraft(supabase, campaignLeadId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('campaign_leads').select(campaignLeadAiSelect),
  )
    .eq('id', campaignLeadId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Campaign lead not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getExistingAiDraft(supabase, campaignLeadId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
    .eq('campaign_lead_id', campaignLeadId)
    .eq('type', 'primary')
    .eq('ai_generated', true)
    .in('status', ['saved', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

export async function generateAiEmailDraft(payload = {}) {
  validateRequired(payload.campaignLeadId, 'campaignLeadId is required.')

  const supabase = getSupabaseClient()
  const campaignLead = await getCampaignLeadForAiDraft(supabase, payload.campaignLeadId)

  if (payload.campaignId && campaignLead.campaign_id !== payload.campaignId) {
    throw createHttpError('Campaign lead does not belong to the requested campaign.', 400)
  }

  if (!payload.regenerate) {
    const existingDraft = await getExistingAiDraft(supabase, campaignLead.id)

    if (existingDraft) {
      return {
        draft: mapDraft(existingDraft),
        alreadyExisting: true,
      }
    }
  }

  const copy = buildAiDraftCopy({
    campaign: campaignLead.campaigns,
    lead: campaignLead.leads || {},
    payload,
  })

  const { data, error } = await supabase
    .from('email_drafts')
    .insert(withWorkspaceFields({
      campaign_id: campaignLead.campaign_id,
      lead_id: campaignLead.lead_id,
      campaign_lead_id: campaignLead.id,
      type: 'primary',
      subject: copy.subject,
      body: copy.body,
      status: 'pending_approval',
      manual_created: false,
      ai_generated: true,
      ...buildAiMetadata({
        generationType: 'primary_outreach',
        tone: payload.tone,
        prompt: `Generate primary outreach draft for campaign lead ${campaignLead.id}. Goal: ${payload.goal || campaignLead.campaigns?.description || ''}.`,
        source: {
          campaignId: campaignLead.campaign_id,
          campaignLeadId: campaignLead.id,
          leadId: campaignLead.lead_id,
        },
      }),
      created_by: null,
    }))
    .select(draftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  return {
    draft: mapDraft(data),
    alreadyExisting: false,
  }
}

async function getReplyForAiDraft(supabase, replyId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('replies').select(`
      id,
      sent_email_id,
      campaign_id,
      lead_id,
      campaign_lead_id,
      subject,
      body_preview,
      from_email,
      received_at,
      leads (
        id,
        name,
        email,
        company
      ),
      sent_emails (
        id,
        subject
      )
    `),
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

async function getExistingAiReplyDraft(supabase, replyId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
    .eq('reply_id', replyId)
    .eq('type', 'reply')
    .eq('ai_generated', true)
    .in('status', ['saved', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

export async function generateAiReplyDraft(payload = {}) {
  validateRequired(payload.replyId, 'replyId is required.')

  const supabase = getSupabaseClient()
  const reply = await getReplyForAiDraft(supabase, payload.replyId)

  if (!payload.regenerate) {
    const existingDraft = await getExistingAiReplyDraft(supabase, reply.id)

    if (existingDraft) {
      return {
        draft: mapDraft(existingDraft),
        alreadyExisting: true,
      }
    }
  }

  const copy = buildAiReplyCopy({ reply, payload })

  const { data, error } = await supabase
    .from('email_drafts')
    .insert(withWorkspaceFields({
      campaign_id: reply.campaign_id,
      lead_id: reply.lead_id,
      campaign_lead_id: reply.campaign_lead_id,
      reply_id: reply.id,
      sent_email_id: reply.sent_email_id,
      type: 'reply',
      subject: copy.subject,
      body: copy.body,
      status: 'pending_approval',
      manual_created: false,
      ai_generated: true,
      ...buildAiMetadata({
        generationType: 'reply',
        tone: copy.tone,
        prompt: copy.prompt,
        source: {
          replyId: reply.id,
          sentEmailId: reply.sent_email_id,
          campaignId: reply.campaign_id,
          campaignLeadId: reply.campaign_lead_id,
          leadId: reply.lead_id,
        },
      }),
      created_by: null,
    }))
    .select(draftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  const mappedDraft = mapDraft(data)
  await safelyCreateDraftNotification(mappedDraft, 'reply_draft_pending_approval')

  return {
    draft: mappedDraft,
    alreadyExisting: false,
  }
}

export async function improveEmailDraftWithAi(draftId, payload = {}) {
  const currentDraft = await getEmailDraftById(draftId)

  if (!['saved', 'rejected', 'pending_approval'].includes(currentDraft.status)) {
    throw createHttpError('Only saved, rejected, or pending approval drafts can be improved.', 400)
  }

  const mode = String(payload.mode || 'grammar').trim().toLowerCase()
  const tone = String(payload.tone || currentDraft.aiTone || 'professional').trim().toLowerCase()
  const subject = mode === 'subject' || mode === 'both'
    ? improveSubject(currentDraft.subject)
    : currentDraft.subject
  const body = mode === 'grammar' || mode === 'both'
    ? improveBodyGrammar(currentDraft.body)
    : currentDraft.body

  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase.from('email_drafts').update({
      subject,
      body,
      ai_generated: true,
      ...buildAiMetadata({
        generationType: mode === 'subject' ? 'subject_improvement' : 'grammar_improvement',
        tone,
        prompt: `Improve ${mode} for draft ${draftId}.`,
        source: {
          draftId,
          previousGenerationType: currentDraft.aiGenerationType || null,
        },
      }),
    }),
  )
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return mapDraft(data)
}

export async function generateCampaignAiEmailDrafts(campaignId, payload = {}) {
  validateRequired(campaignId, 'campaignId is required.')

  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase.from('campaign_leads').select('id'),
  )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(Number(payload.limit || 25), 1), 100))

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const summary = {
    total: data?.length || 0,
    created: 0,
    existing: 0,
    failed: 0,
    drafts: [],
  }

  for (const row of data || []) {
    try {
      const result = await generateAiEmailDraft({
        ...payload,
        campaignId,
        campaignLeadId: row.id,
      })
      if (result.alreadyExisting) summary.existing += 1
      else summary.created += 1
      summary.drafts.push(result.draft)
    } catch {
      summary.failed += 1
    }
  }

  return summary
}

export async function getEmailDraftById(draftId) {
  const supabase = getSupabaseClient()

  const { data, error: fetchError } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
    .eq('id', draftId)
    .single()

  if (fetchError) {
    const error = new Error(fetchError.code === 'PGRST116' ? 'Email draft not found.' : fetchError.message)
    error.statusCode = fetchError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  const mappedDraft = mapDraft(data)

  if (['reply', 'follow_up', 'followup'].includes(mappedDraft.draftType)) {
    await safelyCreateDraftNotification(mappedDraft, 'reply_draft_pending_approval')
  }

  return mappedDraft
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
  const { data, error: updateError } = await scopeWorkspace(
    supabase.from('email_drafts').update(updates),
  )
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
  const { data, error: approveError } = await scopeWorkspace(
    supabase.from('email_drafts').update({
      status: 'approved',
      approved_by: null,
      approved_at: new Date().toISOString(),
      rejected_reason: null,
      rejected_at: null,
    }),
  )
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
  const { data, error: rejectError } = await scopeWorkspace(
    supabase.from('email_drafts').update({
      status: 'rejected',
      rejected_reason: String(rejectedReason || '').trim() || null,
      rejected_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null,
    }),
  )
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

  const { data, error: draftsError } = await scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
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
  let query = scopeWorkspace(
    supabase.from('email_drafts').select(draftSelect),
  )
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
  const { data, error } = await scopeWorkspace(
    supabase.from('email_drafts').update({
      status: 'pending_approval',
      rejected_reason: null,
      rejected_at: null,
    }),
  )
    .eq('id', draftId)
    .select(draftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return mapDraft(data)
}

async function getAccountById(supabase, accountId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('email_accounts').select(accountSelect),
  )
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

  const { data, error } = await scopeWorkspace(
    supabase.from('sent_emails').select('id, email_account_id, subject'),
  )
    .eq('id', sentEmailId)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

async function getExistingSentEmailForDraft(supabase, draftId) {
  const { data, error } = await scopeWorkspace(
    supabase.from('sent_emails').select('id'),
  )
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

async function reserveSendSlot(supabase, account) {
  validateSendAccount(account)

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

function validateLiveAccount(account) {
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
    throw createHttpError('Live reply sending supports Gmail and SMTP accounts only.', 400)
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
  if (account.provider === 'smtp') {
    return sendSmtpMessage({
      account,
      draft: {
        campaign_lead_id: draft.campaignLeadId,
        lead_id: draft.leadId,
        subject: draft.subject,
        body: draft.body,
        lead: draft.lead,
      },
    })
  }

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

  const existingSentEmail = draft.sentEmailIdAfterSend
    ? { id: draft.sentEmailIdAfterSend }
    : await getExistingSentEmailForDraft(supabase, draft.id)

  if (existingSentEmail) {
    throw createHttpError('Reply draft has already been sent.', 409)
  }

  const reservation = await reserveSendSlot(supabase, account)
  let providerSendSucceeded = false
  let sendResult

  try {
    sendResult = await sendReplyThroughProvider(draft, account)
    providerSendSucceeded = getSendMode() === 'live'
  } catch (error) {
    await releaseSendSlot(supabase, account, reservation)
    throw error
  }

  const { data: sentEmail, error: insertError } = await supabase
    .from('sent_emails')
    .insert(withWorkspaceFields({
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
    }))
    .select(sentEmailSelect)
    .single()

  if (insertError) {
    if (!providerSendSucceeded) {
      await releaseSendSlot(supabase, account, reservation)
    }
    throw createHttpError(insertError.message, insertError.code === '23505' ? 409 : 500)
  }

  const { data: updatedDraft, error: draftUpdateError } = await scopeWorkspace(
    supabase.from('email_drafts').update({
      status: 'sent',
      sent_email_id_after_send: sentEmail.id,
    }),
  )
    .eq('id', draft.id)
    .select(draftSelect)
    .single()

  if (draftUpdateError) {
    if (!providerSendSucceeded) {
      await releaseSendSlot(supabase, account, reservation)
    }
    throw createHttpError(draftUpdateError.message, 500)
  }

  return {
    draft: mapDraft(updatedDraft),
    sentEmail: mapSentEmail(sentEmail),
    sendMode: getSendMode(),
  }
}
