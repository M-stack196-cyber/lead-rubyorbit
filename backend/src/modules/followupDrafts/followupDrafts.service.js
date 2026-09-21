import { createSupabaseServiceClient } from '../../config/supabase.js'

const defaultFollowupBody = 'Hi {{firstName}},\n\nJust following up on my previous email.\n\nBest,\nDatamart'
const followupDraftTypes = ['follow_up', 'followup']
const unsentDraftStatuses = ['draft', 'saved', 'pending_approval', 'approved', 'rejected']

const draftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  type,
  subject,
  body,
  status,
  followup_number,
  previous_sent_email_id,
  source_team_decision_id,
  source_no_reply_sent_email_id,
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
    followup_count,
    last_followup_draft_id
  )
`

const duplicateDraftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  type,
  subject,
  body,
  status,
  followup_number,
  previous_sent_email_id,
  source_team_decision_id,
  source_no_reply_sent_email_id,
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
  )
`

const noReplySentEmailSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
  subject,
  status,
  sent_at,
  no_reply_marked_at,
  leads (
    id,
    name,
    email,
    company
  ),
  campaign_leads (
    id,
    outreach_status,
    followup_count,
    last_followup_draft_id
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

function mapDraft(row, extra = {}) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    draftType: row.type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    followupNumber: row.followup_number,
    previousSentEmailId: row.previous_sent_email_id,
    sourceTeamDecisionId: row.source_team_decision_id,
    sourceNoReplySentEmailId: row.source_no_reply_sent_email_id,
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
          followupCount: row.campaign_leads.followup_count,
          lastFollowupDraftId: row.campaign_leads.last_followup_draft_id,
        }
      : null,
    ...extra,
  }
}

function mapCandidate(sentEmail, existingDraft = null, decision = null) {
  return {
    sentEmailId: sentEmail.id,
    campaignId: sentEmail.campaign_id,
    leadId: sentEmail.lead_id,
    campaignLeadId: sentEmail.campaign_lead_id,
    originalSubject: sentEmail.subject,
    sentAt: sentEmail.sent_at,
    noReplyMarkedAt: sentEmail.no_reply_marked_at,
    lead: sentEmail.leads
      ? {
          id: sentEmail.leads.id,
          name: sentEmail.leads.name,
          email: sentEmail.leads.email,
          company: sentEmail.leads.company,
        }
      : null,
    campaignLead: sentEmail.campaign_leads
      ? {
          id: sentEmail.campaign_leads.id,
          outreachStatus: sentEmail.campaign_leads.outreach_status,
          followupCount: sentEmail.campaign_leads.followup_count,
          lastFollowupDraftId: sentEmail.campaign_leads.last_followup_draft_id,
        }
      : null,
    existingDraft: existingDraft ? mapDraft(existingDraft) : null,
    teamDecision: decision
      ? {
          id: decision.id,
          status: decision.status,
          decisionType: decision.decision_type || decision.action,
        }
      : null,
  }
}

function followupSubject(originalSubject = '') {
  const subject = String(originalSubject || '').trim()
  return subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject || 'Follow up'}`
}

async function getFollowupDraftRowById(supabase, draftId) {
  const { data, error } = await supabase
    .from('email_drafts')
    .select(duplicateDraftSelect)
    .eq('id', draftId)
    .in('type', followupDraftTypes)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Follow-up draft not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  return data
}

async function getNoReplySentEmail(supabase, sentEmailId) {
  const { data, error } = await supabase
    .from('sent_emails')
    .select(noReplySentEmailSelect)
    .eq('id', sentEmailId)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'No-reply sent email not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  if (data.status !== 'no_reply') {
    throw createHttpError('Sent email must be marked no_reply before creating a follow-up draft.', 400)
  }

  if (!['followup_required', 'no_reply'].includes(data.campaign_leads?.outreach_status)) {
    throw createHttpError('Campaign lead is not marked for follow-up review.', 400)
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

async function getExistingUnsentFollowupDraft(supabase, campaignLeadId, sentEmailId) {
  const { data, error } = await supabase
    .from('email_drafts')
    .select(duplicateDraftSelect)
    .eq('campaign_lead_id', campaignLeadId)
    .eq('source_no_reply_sent_email_id', sentEmailId)
    .in('type', followupDraftTypes)
    .in('status', unsentDraftStatuses)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data?.[0] || null
}

async function getPendingNoReplyDecision(supabase, sentEmailId) {
  const { data, error } = await supabase
    .from('team_decisions')
    .select('id, status, decision_type, action')
    .eq('sent_email_id', sentEmailId)
    .eq('reason', 'no_reply_timeout')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data?.[0] || null
}

async function getNextFollowupNumber(supabase, campaignLeadId) {
  const { data, error } = await supabase
    .from('email_drafts')
    .select('followup_number')
    .eq('campaign_lead_id', campaignLeadId)
    .in('type', followupDraftTypes)
    .order('followup_number', { ascending: false, nullsFirst: false })
    .limit(1)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data?.[0]?.followup_number || 0) + 1
}

export async function listFollowupDrafts(filters = {}) {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('email_drafts')
    .select(duplicateDraftSelect)
    .in('type', followupDraftTypes)
    .order('updated_at', { ascending: false })

  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId)
  }

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map((row) => mapDraft(row))
}

export async function getFollowupDraftById(draftId) {
  const supabase = getSupabaseClient()
  const row = await getFollowupDraftRowById(supabase, draftId)

  return mapDraft(row)
}

export async function listFollowupCandidates(campaignId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sent_emails')
    .select(noReplySentEmailSelect)
    .eq('campaign_id', campaignId)
    .eq('status', 'no_reply')
    .in('campaign_leads.outreach_status', ['followup_required', 'no_reply'])
    .order('no_reply_marked_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const candidates = []

  for (const sentEmail of data || []) {
    if (!sentEmail.campaign_lead_id) continue

    const [replyCount, existingDraft, decision] = await Promise.all([
      getReplyCount(supabase, sentEmail.id),
      getExistingUnsentFollowupDraft(supabase, sentEmail.campaign_lead_id, sentEmail.id),
      getPendingNoReplyDecision(supabase, sentEmail.id),
    ])

    if (replyCount > 0 || existingDraft) continue

    candidates.push(mapCandidate(sentEmail, existingDraft, decision))
  }

  return candidates
}

export async function createFollowupDraft(payload = {}) {
  validateRequired(payload.campaignId, 'campaignId is required.')
  validateRequired(payload.leadId, 'leadId is required.')
  validateRequired(payload.campaignLeadId, 'campaignLeadId is required.')
  validateRequired(payload.sourceNoReplySentEmailId, 'sourceNoReplySentEmailId is required.')

  const supabase = getSupabaseClient()
  const sentEmail = await getNoReplySentEmail(supabase, payload.sourceNoReplySentEmailId)

  if (
    sentEmail.campaign_id !== payload.campaignId ||
    sentEmail.lead_id !== payload.leadId ||
    sentEmail.campaign_lead_id !== payload.campaignLeadId
  ) {
    throw createHttpError('Source no-reply sent email does not match the requested campaign lead.', 400)
  }

  const replyCount = await getReplyCount(supabase, sentEmail.id)

  if (replyCount > 0) {
    throw createHttpError('A reply exists for this sent email. Follow-up draft creation is blocked.', 400)
  }

  const existingDraft = await getExistingUnsentFollowupDraft(
    supabase,
    payload.campaignLeadId,
    payload.sourceNoReplySentEmailId,
  )

  if (existingDraft) {
    return {
      draft: mapDraft(existingDraft),
      alreadyExisting: true,
    }
  }

  const followupNumber = await getNextFollowupNumber(supabase, payload.campaignLeadId)
  const subject = String(payload.subject || followupSubject(sentEmail.subject)).trim()
  const body = String(payload.body || defaultFollowupBody).trim()

  const { data, error } = await supabase
    .from('email_drafts')
    .insert({
      campaign_id: payload.campaignId,
      lead_id: payload.leadId,
      campaign_lead_id: payload.campaignLeadId,
      type: 'follow_up',
      subject,
      body,
      status: 'saved',
      followup_number: followupNumber,
      previous_sent_email_id: sentEmail.id,
      source_no_reply_sent_email_id: sentEmail.id,
      source_team_decision_id: payload.sourceTeamDecisionId || null,
      ai_generated: false,
      manual_created: true,
      created_by: null,
    })
    .select(duplicateDraftSelect)
    .single()

  if (error) {
    if (error.code === '23505') {
      const duplicate = await getExistingUnsentFollowupDraft(
        supabase,
        payload.campaignLeadId,
        payload.sourceNoReplySentEmailId,
      )

      if (duplicate) {
        return {
          draft: mapDraft(duplicate),
          alreadyExisting: true,
        }
      }
    }

    throw createHttpError(error.message, error.code === '23503' ? 400 : 500)
  }

  const { error: leadError } = await supabase
    .from('campaign_leads')
    .update({
      outreach_status: 'awaiting_approval',
      followup_count: followupNumber,
      last_followup_draft_id: data.id,
    })
    .eq('id', payload.campaignLeadId)

  if (leadError) {
    throw createHttpError(leadError.message, 500)
  }

  return {
    draft: mapDraft(data),
    alreadyExisting: false,
  }
}

export async function createFollowupDraftFromNoReply(sentEmailId, payload = {}) {
  const supabase = getSupabaseClient()
  const sentEmail = await getNoReplySentEmail(supabase, sentEmailId)
  const decision = payload.sourceTeamDecisionId
    ? { id: payload.sourceTeamDecisionId }
    : await getPendingNoReplyDecision(supabase, sentEmail.id)

  return createFollowupDraft({
    campaignId: sentEmail.campaign_id,
    leadId: sentEmail.lead_id,
    campaignLeadId: sentEmail.campaign_lead_id,
    sourceNoReplySentEmailId: sentEmail.id,
    sourceTeamDecisionId: decision?.id,
    subject: payload.subject,
    body: payload.body,
  })
}
