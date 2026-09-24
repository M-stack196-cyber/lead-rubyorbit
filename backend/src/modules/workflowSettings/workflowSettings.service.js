import { createSupabaseServiceClient } from '../../config/supabase.js'
import { scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'

const settingsSelect = `
  id,
  campaign_id,
  reply_check_interval_value,
  reply_check_interval_unit,
  reply_waiting_time_value,
  reply_waiting_time_unit,
  no_reply_timeout_days,
  automation_campaign_batch_size,
  create_followup_drafts,
  followup_draft_batch_size,
  created_at,
  updated_at
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

function clampNumber(value, fallback, min, max) {
  const next = Number(value ?? fallback)
  if (!Number.isFinite(next) || next < min || next > max) {
    throw createHttpError(`Value must be between ${min} and ${max}.`, 400)
  }
  return Math.floor(next)
}

function mapSettings(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    replyCheckIntervalValue: row.reply_check_interval_value,
    replyCheckIntervalUnit: row.reply_check_interval_unit,
    replyWaitingTimeValue: row.reply_waiting_time_value,
    replyWaitingTimeUnit: row.reply_waiting_time_unit,
    noReplyTimeoutDays: row.no_reply_timeout_days,
    automationCampaignBatchSize: row.automation_campaign_batch_size,
    createFollowupDrafts: row.create_followup_drafts,
    followupDraftBatchSize: row.followup_draft_batch_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getExistingWorkspaceSettings(supabase) {
  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_settings').select(settingsSelect),
  )
    .is('campaign_id', null)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

export async function getWorkflowSettings() {
  const supabase = getSupabaseClient()
  const existing = await getExistingWorkspaceSettings(supabase)

  if (existing) return mapSettings(existing)

  const { data, error } = await supabase
    .from('workflow_settings')
    .insert(withWorkspaceFields({
      campaign_id: null,
      reply_check_interval_value: 5,
      reply_check_interval_unit: 'minutes',
      reply_waiting_time_value: 2,
      reply_waiting_time_unit: 'days',
      no_reply_timeout_days: 3,
      automation_campaign_batch_size: 25,
      create_followup_drafts: false,
      followup_draft_batch_size: 25,
    }))
    .select(settingsSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23505' ? 409 : 500)
  }

  return mapSettings(data)
}

export async function updateWorkflowSettings(payload = {}) {
  const supabase = getSupabaseClient()
  const current = await getWorkflowSettings()

  const updates = {
    reply_check_interval_value: clampNumber(
      payload.replyCheckIntervalValue,
      current.replyCheckIntervalValue,
      1,
      1440,
    ),
    reply_check_interval_unit: payload.replyCheckIntervalUnit || current.replyCheckIntervalUnit,
    reply_waiting_time_value: clampNumber(
      payload.replyWaitingTimeValue,
      current.replyWaitingTimeValue,
      1,
      30,
    ),
    reply_waiting_time_unit: payload.replyWaitingTimeUnit || current.replyWaitingTimeUnit,
    no_reply_timeout_days: clampNumber(payload.noReplyTimeoutDays, current.noReplyTimeoutDays, 1, 30),
    automation_campaign_batch_size: clampNumber(
      payload.automationCampaignBatchSize,
      current.automationCampaignBatchSize,
      1,
      100,
    ),
    create_followup_drafts: Object.prototype.hasOwnProperty.call(payload, 'createFollowupDrafts')
      ? Boolean(payload.createFollowupDrafts)
      : current.createFollowupDrafts,
    followup_draft_batch_size: clampNumber(
      payload.followupDraftBatchSize,
      current.followupDraftBatchSize,
      1,
      100,
    ),
  }

  if (!['seconds', 'minutes', 'hours', 'days'].includes(updates.reply_check_interval_unit)) {
    throw createHttpError('Invalid reply check interval unit.', 400)
  }

  if (!['seconds', 'minutes', 'hours', 'days'].includes(updates.reply_waiting_time_unit)) {
    throw createHttpError('Invalid reply waiting time unit.', 400)
  }

  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_settings').update(updates),
  )
    .eq('id', current.id)
    .select(settingsSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return mapSettings(data)
}
