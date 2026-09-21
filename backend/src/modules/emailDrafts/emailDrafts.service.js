import { createSupabaseServiceClient } from '../../config/supabase.js'

const allowedDraftTypes = new Set(['primary', 'follow_up', 'reply', 'manual'])
const allowedDraftStatuses = new Set(['draft', 'saved', 'approved', 'rejected'])

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

function mapDraft(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
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
  }
}

const draftSelect = `
  id,
  campaign_id,
  lead_id,
  campaign_lead_id,
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
  )
`

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

  if (currentDraft.status === 'approved') {
    const error = new Error('Approved drafts cannot be edited.')
    error.statusCode = 400
    throw error
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
  await getEmailDraftById(draftId)

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
  await getEmailDraftById(draftId)

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
