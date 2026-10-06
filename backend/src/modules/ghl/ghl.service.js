import { createSupabaseServiceClient } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { createGhlClient, getGhlSettingsStatus } from './ghl.client.js'
import { runWithWorkspace, scopeWorkspace } from '../../middleware/workspace.js'

let supabaseFactory = createSupabaseServiceClient

export function setGhlSupabaseFactoryForTests(factory) {
  supabaseFactory = factory || createSupabaseServiceClient
}

function getSupabaseClient() {
  const supabase = supabaseFactory()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

export function getSettingsStatus() {
  return getGhlSettingsStatus()
}

export function getGhlStatus(_workspaceId) {
  return getSettingsStatus()
}

export async function syncCampaignToGhl(campaignId) {
  const rows = await getCampaignLeadRows(campaignId)
  return syncRows(campaignId, rows.filter((row) => row.ghl_sync_status !== 'synced'))
}

export async function syncCampaignLeadsToGhl(workspaceId, campaignId) {
  return runWithWorkspace(workspaceId, () => syncCampaignToGhl(campaignId))
}

export async function syncCampaignLeadToGhl(workspaceId, campaignLeadId) {
  return runWithWorkspace(workspaceId, async () => {
    const row = await getCampaignLeadRow(campaignLeadId)
    return syncRows(row.campaign_id, [row])
  })
}

export async function retryFailedGhlSync(campaignId) {
  const rows = await getCampaignLeadRows(campaignId)
  return syncRows(campaignId, rows.filter((row) => row.ghl_sync_status === 'failed'))
}

export async function getCampaignGhlSyncStatus(campaignId) {
  const campaign = await getCampaignById(campaignId)
  const rows = await getCampaignLeadRows(campaignId)
  const summary = buildSummary(rows)

  return {
    campaign,
    summary,
    rows: rows.map(mapSyncStatusRow),
  }
}

async function syncRows(campaignId, rowsToSync) {
  const allRows = await getCampaignLeadRows(campaignId)
  const skipped = allRows.filter((row) => row.ghl_sync_status === 'synced').length

  if (!rowsToSync.length) {
    return {
      campaignId,
      total: allRows.length,
      synced: 0,
      skipped,
      failed: 0,
    }
  }

  const supabase = getSupabaseClient()
  const client = createGhlClient()
  let synced = 0
  let failed = 0
  const warnings = []

  for (const row of rowsToSync) {
    try {
      const result = await syncOneRow(client, row)

      const { error: updateError } = await scopeWorkspace(
        supabase.from('campaign_leads').update({
          ghl_contact_id: result.contactId,
          ghl_sync_status: 'synced',
          ghl_sync_error: null,
          ghl_synced_at: new Date().toISOString(),
          ghl_workflow_id: result.workflowId || row.ghl_workflow_id || null,
          outreach_status: 'synced_to_ghl',
        }),
      )
        .eq('id', row.id)

      if (updateError) {
        throw updateError
      }

      synced += 1
      warnings.push(...result.warnings.map((warning) => ({ campaignLeadId: row.id, ...warning })))
    } catch (syncError) {
      failed += 1

      await scopeWorkspace(
        supabase.from('campaign_leads').update({
          ghl_sync_status: 'failed',
          ghl_sync_error: safeErrorMessage(syncError),
          outreach_status: 'ghl_failed',
        }),
      )
        .eq('id', row.id)
    }
  }

  return {
    campaignId,
    total: allRows.length,
    synced,
    skipped,
    failed,
    warnings,
  }
}

async function syncOneRow(client, row) {
  const lead = row.leads || {}
  const campaign = row.campaigns || {}
  const contactPayload = buildContactPayload({ lead, campaign })
  const warnings = []

  const contact = await client.createContact({
    campaignLeadId: row.id,
    lead,
    contact: contactPayload,
  })
  const contactId = contact.contactId
  let workflowId = row.ghl_workflow_id || null

  if (env.ghl.mode !== 'live' || env.ghl.workflowId) {
    try {
      const workflow = await client.enrollContactInWorkflow({
        contactId,
        workflowId: env.ghl.workflowId,
        lead,
      })
      workflowId = workflow.workflowId || env.ghl.workflowId || 'mock_ghl_workflow_default'
    } catch (workflowError) {
      warnings.push({
        type: 'workflow',
        message: safeErrorMessage(workflowError),
      })
    }
  }

  if (env.ghl.pipelineId) {
    try {
      await client.createOpportunity({
        opportunity: buildOpportunityPayload({ contactId, lead, campaign }),
      })
    } catch (opportunityError) {
      warnings.push({
        type: 'opportunity',
        message: safeErrorMessage(opportunityError),
      })
    }
  }

  return {
    contactId,
    workflowId,
    warnings,
  }
}

function buildContactPayload({ lead, campaign }) {
  const payload = {
    locationId: env.ghl.locationId,
    name: lead.name || lead.email || lead.company || 'LeadRubyOrbit Lead',
    email: lead.email,
    source: 'LeadRubyOrbit',
    tags: uniqueCompact([campaign.name, lead.source, 'rubyorbit']),
  }

  if (lead.phone) {
    payload.phone = lead.phone
  }

  return payload
}

function buildOpportunityPayload({ contactId, lead, campaign }) {
  const payload = {
    pipelineId: env.ghl.pipelineId,
    locationId: env.ghl.locationId,
    contactId,
    name: `${campaign.name || 'LeadRubyOrbit'} - ${lead.name || lead.email || 'Lead'}`,
    status: 'open',
  }

  if (env.ghl.pipelineStageId) {
    payload.pipelineStageId = env.ghl.pipelineStageId
  }

  return payload
}

function uniqueCompact(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function safeErrorMessage(error) {
  const message = String(error?.message || 'GHL sync failed.')
  const token = env.ghl.privateIntegrationToken
  return token ? message.replaceAll(token, '[redacted]') : message
}

async function getCampaignById(campaignId) {
  const supabase = getSupabaseClient()

  const { data, error: campaignError } = await scopeWorkspace(
    supabase
      .from('campaigns')
      .select('id, name, description, status, ghl_workflow_id, created_at, updated_at'),
  )
    .eq('id', campaignId)
    .single()

  if (campaignError) {
    const error = new Error(
      campaignError.code === 'PGRST116' ? 'Campaign not found.' : campaignError.message,
    )
    error.statusCode = campaignError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return data
}

async function getCampaignLeadRows(campaignId) {
  await getCampaignById(campaignId)

  const supabase = getSupabaseClient()
  const { data, error: rowsError } = await scopeWorkspace(
    supabase.from('campaign_leads').select(
      `
        id,
        campaign_id,
        lead_id,
        ghl_contact_id,
        ghl_sync_status,
        ghl_sync_error,
        ghl_synced_at,
        ghl_workflow_id,
        created_at,
        campaigns (
          id,
          name
        ),
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
          status
        )
      `,
    ),
  )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (rowsError) {
    const error = new Error(rowsError.message)
    error.statusCode = 500
    throw error
  }

  return data || []
}

async function getCampaignLeadRow(campaignLeadId) {
  const supabase = getSupabaseClient()
  const { data, error: rowError } = await scopeWorkspace(
    supabase.from('campaign_leads').select(
      `
        id,
        campaign_id,
        lead_id,
        ghl_contact_id,
        ghl_sync_status,
        ghl_sync_error,
        ghl_synced_at,
        ghl_workflow_id,
        created_at,
        campaigns (
          id,
          name
        ),
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
          status
        )
      `,
    ),
  )
    .eq('id', campaignLeadId)
    .single()

  if (rowError) {
    const error = new Error(
      rowError.code === 'PGRST116' ? 'Campaign lead not found.' : rowError.message,
    )
    error.statusCode = rowError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  await getCampaignById(data.campaign_id)

  return data
}

function buildSummary(rows = []) {
  return {
    total: rows.length,
    synced: rows.filter((row) => row.ghl_sync_status === 'synced').length,
    pending: rows.filter((row) => row.ghl_sync_status === 'pending').length,
    failed: rows.filter((row) => row.ghl_sync_status === 'failed').length,
  }
}

function mapSyncStatusRow(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    leadName: row.leads?.name || '',
    email: row.leads?.email || '',
    company: row.leads?.company || '',
    ghlSyncStatus: row.ghl_sync_status,
    ghlContactId: row.ghl_contact_id,
    ghlSyncError: row.ghl_sync_error,
    ghlSyncedAt: row.ghl_synced_at,
    ghlWorkflowId: row.ghl_workflow_id,
  }
}
