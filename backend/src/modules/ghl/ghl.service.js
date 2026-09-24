import { createSupabaseServiceClient } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { createGhlClient, getGhlSettingsStatus } from './ghl.client.js'
import { scopeWorkspace } from '../../middleware/workspace.js'

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

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

export async function syncCampaignToGhl(campaignId) {
  const rows = await getCampaignLeadRows(campaignId)
  return syncRows(campaignId, rows.filter((row) => row.ghl_sync_status !== 'synced'))
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

  for (const row of rowsToSync) {
    try {
      const contact = await client.createContact({
        campaignLeadId: row.id,
        lead: row.leads,
      })
      const workflow = await client.enrollContactInWorkflow({
        contactId: contact.contactId,
        workflowId: env.ghl.workflowId,
        lead: row.leads,
      })

      const { error: updateError } = await scopeWorkspace(
        supabase.from('campaign_leads').update({
          ghl_contact_id: contact.contactId,
          ghl_sync_status: 'synced',
          ghl_sync_error: null,
          ghl_synced_at: new Date().toISOString(),
          ghl_workflow_id: workflow.workflowId || env.ghl.workflowId || 'mock_ghl_workflow_default',
          outreach_status: 'synced_to_ghl',
        }),
      )
        .eq('id', row.id)

      if (updateError) {
        throw updateError
      }

      synced += 1
    } catch (syncError) {
      failed += 1

      await scopeWorkspace(
        supabase.from('campaign_leads').update({
          ghl_sync_status: 'failed',
          ghl_sync_error: syncError.message || 'GHL sync failed.',
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
  }
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
