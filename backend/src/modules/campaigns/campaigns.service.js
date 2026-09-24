import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  getCurrentWorkspaceId,
  scopeWorkspace,
  withWorkspaceFields,
} from '../../middleware/workspace.js'

const allowedStatuses = new Set(['draft', 'active', 'paused', 'completed', 'archived'])
const allowedLeadOutreachStatuses = new Set(['pending', 'paused', 'stopped'])

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

function validateCampaignStatus(status) {
  if (status && !allowedStatuses.has(status)) {
    const error = new Error('Invalid campaign status.')
    error.statusCode = 400
    throw error
  }
}

function validateCampaignName(name) {
  if (!String(name || '').trim()) {
    const error = new Error('Campaign name is required.')
    error.statusCode = 400
    throw error
  }
}

function validateLeadOutreachStatus(status) {
  if (!allowedLeadOutreachStatuses.has(status)) {
    const error = new Error('Lead outreach status must be pending, paused, or stopped.')
    error.statusCode = 400
    throw error
  }
}

function mapCampaignWithLeadCount(campaign, countsByCampaignId = new Map()) {
  return {
    ...campaign,
    leadCount: countsByCampaignId.get(campaign.id) || 0,
  }
}

export async function listCampaigns() {
  const supabase = getSupabaseClient()
  const workspaceId = getCurrentWorkspaceId()

  const { data: campaigns, error: campaignsError } = await scopeWorkspace(
    supabase
      .from('campaigns')
      .select('id, name, description, status, created_at, updated_at'),
    workspaceId,
  )
    .order('created_at', { ascending: false })

  if (campaignsError) {
    const error = new Error(campaignsError.message)
    error.statusCode = 500
    throw error
  }

  if (!campaigns.length) {
    return []
  }

  const campaignIds = campaigns.map((campaign) => campaign.id)
  const { data: campaignLeads, error: countError } = await scopeWorkspace(
    supabase.from('campaign_leads').select('campaign_id'),
    workspaceId,
  )
    .in('campaign_id', campaignIds)

  if (countError) {
    const error = new Error(countError.message)
    error.statusCode = 500
    throw error
  }

  const countsByCampaignId = new Map()

  for (const row of campaignLeads || []) {
    countsByCampaignId.set(row.campaign_id, (countsByCampaignId.get(row.campaign_id) || 0) + 1)
  }

  return campaigns.map((campaign) => mapCampaignWithLeadCount(campaign, countsByCampaignId))
}

export async function createCampaign(payload = {}) {
  validateCampaignName(payload.name)
  validateCampaignStatus(payload.status)

  const supabase = getSupabaseClient()

  const { data, error: createError } = await supabase
    .from('campaigns')
    .insert(withWorkspaceFields({
      name: String(payload.name).trim(),
      description: String(payload.description || '').trim() || null,
      status: payload.status || 'draft',
    }))
    .select('id, name, description, status, created_at, updated_at')
    .single()

  if (createError) {
    const error = new Error(createError.message)
    error.statusCode = 500
    throw error
  }

  return mapCampaignWithLeadCount(data)
}

export async function getCampaignById(campaignId) {
  const supabase = getSupabaseClient()
  const workspaceId = getCurrentWorkspaceId()

  const { data, error: fetchError } = await scopeWorkspace(
    supabase
      .from('campaigns')
      .select('id, name, description, status, created_at, updated_at'),
    workspaceId,
  )
    .eq('id', campaignId)
    .single()

  if (fetchError) {
    const error = new Error(fetchError.code === 'PGRST116' ? 'Campaign not found.' : fetchError.message)
    error.statusCode = fetchError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  const { count, error: countError } = await scopeWorkspace(
    supabase.from('campaign_leads').select('id', { count: 'exact', head: true }),
    workspaceId,
  )
    .eq('campaign_id', campaignId)

  if (countError) {
    const error = new Error(countError.message)
    error.statusCode = 500
    throw error
  }

  return {
    ...data,
    leadCount: count || 0,
  }
}

export async function updateCampaign(campaignId, payload = {}) {
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    validateCampaignName(payload.name)
  }

  validateCampaignStatus(payload.status)

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    updates.name = String(payload.name).trim()
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    updates.description = String(payload.description || '').trim() || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = payload.status
  }

  if (!Object.keys(updates).length) {
    const error = new Error('No campaign fields provided to update.')
    error.statusCode = 400
    throw error
  }

  const supabase = getSupabaseClient()

  const { data, error: updateError } = await scopeWorkspace(
    supabase.from('campaigns').update(updates),
  )
    .eq('id', campaignId)
    .select('id, name, description, status, created_at, updated_at')
    .single()

  if (updateError) {
    const error = new Error(updateError.code === 'PGRST116' ? 'Campaign not found.' : updateError.message)
    error.statusCode = updateError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return data
}

export async function addLeadsToCampaign(campaignId, leadIds = []) {
  if (!Array.isArray(leadIds) || !leadIds.length) {
    const error = new Error('leadIds must be a non-empty array.')
    error.statusCode = 400
    throw error
  }

  const uniqueLeadIds = [...new Set(leadIds.filter(Boolean))]

  if (!uniqueLeadIds.length) {
    const error = new Error('leadIds must contain at least one lead id.')
    error.statusCode = 400
    throw error
  }

  await getCampaignById(campaignId)

  const supabase = getSupabaseClient()
  const workspaceId = getCurrentWorkspaceId()

  const { data: workspaceLeads, error: leadsError } = await scopeWorkspace(
    supabase.from('leads').select('id'),
    workspaceId,
  )
    .in('id', uniqueLeadIds)

  if (leadsError) {
    const error = new Error(leadsError.message)
    error.statusCode = 500
    throw error
  }

  const workspaceLeadIds = new Set((workspaceLeads || []).map((row) => row.id))
  const invalidLeadIds = uniqueLeadIds.filter((leadId) => !workspaceLeadIds.has(leadId))

  if (invalidLeadIds.length) {
    const error = new Error('One or more leads do not belong to the active workspace.')
    error.statusCode = 400
    throw error
  }

  const { data: existingRows, error: existingError } = await scopeWorkspace(
    supabase.from('campaign_leads').select('lead_id'),
    workspaceId,
  )
    .eq('campaign_id', campaignId)
    .in('lead_id', uniqueLeadIds)

  if (existingError) {
    const error = new Error(existingError.message)
    error.statusCode = 500
    throw error
  }

  const existingLeadIds = new Set((existingRows || []).map((row) => row.lead_id))
  const newLeadIds = uniqueLeadIds.filter((leadId) => !existingLeadIds.has(leadId))

  if (!newLeadIds.length) {
    return {
      campaignId,
      addedCount: 0,
      skippedCount: uniqueLeadIds.length,
      addedLeadIds: [],
      skippedLeadIds: uniqueLeadIds,
    }
  }

  const rowsToInsert = newLeadIds.map((leadId) => ({
    campaign_id: campaignId,
    lead_id: leadId,
    workspace_id: workspaceId,
  }))

  const { data: insertedRows, error: insertError } = await supabase
    .from('campaign_leads')
    .insert(rowsToInsert)
    .select('id, campaign_id, lead_id, created_at')

  if (insertError) {
    const error = new Error(insertError.message)
    error.statusCode = insertError.code === '23503' ? 400 : 500
    throw error
  }

  return {
    campaignId,
    addedCount: insertedRows.length,
    skippedCount: uniqueLeadIds.length - insertedRows.length,
    addedLeadIds: insertedRows.map((row) => row.lead_id),
    skippedLeadIds: uniqueLeadIds.filter((leadId) => !insertedRows.some((row) => row.lead_id === leadId)),
  }
}

export async function listCampaignLeads(campaignId) {
  await getCampaignById(campaignId)

  const supabase = getSupabaseClient()
  const workspaceId = getCurrentWorkspaceId()

  const { data, error: leadsError } = await scopeWorkspace(
    supabase.from('campaign_leads').select(
      `
        id,
        campaign_id,
        lead_id,
        ghl_sync_status,
        outreach_status,
        current_step,
        created_at,
        leads (
          id,
          name,
          email,
          phone,
          company,
          website,
          linkedin_url,
          location,
          source,
          status,
          created_at
        )
      `,
    ),
    workspaceId,
  )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (leadsError) {
    const error = new Error(leadsError.message)
    error.statusCode = 500
    throw error
  }

  return (data || []).map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    ghlSyncStatus: row.ghl_sync_status,
    outreachStatus: row.outreach_status,
    currentStep: row.current_step,
    createdAt: row.created_at,
    lead: row.leads,
  }))
}

export async function updateCampaignLeadOutreachStatus(campaignId, campaignLeadId, payload = {}) {
  validateLeadOutreachStatus(payload.outreachStatus)
  await getCampaignById(campaignId)

  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase.from('campaign_leads').update({
      outreach_status: payload.outreachStatus,
    }),
  )
    .eq('id', campaignLeadId)
    .eq('campaign_id', campaignId)
    .select(
      `
        id,
        campaign_id,
        lead_id,
        ghl_sync_status,
        outreach_status,
        current_step,
        created_at,
        leads (
          id,
          name,
          email,
          phone,
          company,
          website,
          linkedin_url,
          location,
          source,
          status,
          created_at
        )
      `,
    )
    .single()

  if (error) {
    const nextError = new Error(error.code === 'PGRST116' ? 'Campaign lead not found.' : error.message)
    nextError.statusCode = error.code === 'PGRST116' ? 404 : 500
    throw nextError
  }

  return {
    id: data.id,
    campaignId: data.campaign_id,
    leadId: data.lead_id,
    ghlSyncStatus: data.ghl_sync_status,
    outreachStatus: data.outreach_status,
    currentStep: data.current_step,
    createdAt: data.created_at,
    lead: data.leads,
  }
}
