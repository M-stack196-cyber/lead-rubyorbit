import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  defaultWorkspaceId,
  runWithWorkspace,
  scopeWorkspace,
} from '../../middleware/workspace.js'
import { checkCampaignNoReplies } from '../noReplyMonitoring/noReplyMonitoring.service.js'
import { checkCampaignReplies } from '../replyMonitoring/replyMonitoring.service.js'
import {
  createFollowupDraftFromNoReply,
  listFollowupCandidates,
} from '../followupDrafts/followupDrafts.service.js'

const automationState = {
  running: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastResult: null,
  lastError: null,
}

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

function automationConfig(overrides = {}) {
  return {
    enabled: env.automation.enabled,
    intervalMs: env.automation.intervalMs,
    campaignBatchSize: Math.min(Math.max(Number(overrides.campaignBatchSize || env.automation.campaignBatchSize), 1), 100),
    noReplyTimeoutDays: Math.min(Math.max(Number(overrides.noReplyTimeoutDays || env.automation.noReplyTimeoutDays), 1), 30),
    createFollowupDrafts:
      typeof overrides.createFollowupDrafts === 'boolean'
        ? overrides.createFollowupDrafts
        : env.automation.createFollowupDrafts,
    followupDraftBatchSize: Math.min(
      Math.max(Number(overrides.followupDraftBatchSize || env.automation.followupDraftBatchSize), 1),
      100,
    ),
  }
}

async function listWorkspaceIds(supabase) {
  if (!env.auth.required) {
    return [defaultWorkspaceId]
  }

  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((workspace) => workspace.id)
}

async function listActiveCampaigns(supabase, limit) {
  const { data, error } = await scopeWorkspace(
    supabase.from('campaigns').select('id, name, status'),
  )
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

async function createDueFollowupDrafts(campaignId, config) {
  if (!config.createFollowupDrafts) {
    return {
      candidates: 0,
      created: 0,
      existing: 0,
      failed: 0,
      skipped: true,
    }
  }

  const candidates = await listFollowupCandidates(campaignId)
  const summary = {
    candidates: candidates.length,
    created: 0,
    existing: 0,
    failed: 0,
    skipped: false,
  }

  for (const candidate of candidates.slice(0, config.followupDraftBatchSize)) {
    try {
      const result = await createFollowupDraftFromNoReply(candidate.sentEmailId)
      if (result.alreadyExisting) summary.existing += 1
      else summary.created += 1
    } catch {
      summary.failed += 1
    }
  }

  return summary
}

async function processCampaign(campaign, config) {
  const replies = await checkCampaignReplies(campaign.id)
  const noReplies = await checkCampaignNoReplies(campaign.id, {
    timeoutDays: config.noReplyTimeoutDays,
  })
  const followups = await createDueFollowupDrafts(campaign.id, config)

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    replies,
    noReplies,
    followups,
  }
}

async function processWorkspace(workspaceId, config) {
  return runWithWorkspace(workspaceId, async () => {
    const supabase = getSupabaseClient()
    const campaigns = await listActiveCampaigns(supabase, config.campaignBatchSize)
    const summary = {
      workspaceId,
      campaignsFound: campaigns.length,
      campaignsProcessed: 0,
      failed: 0,
      results: [],
    }

    for (const campaign of campaigns) {
      try {
        const result = await processCampaign(campaign, config)
        summary.campaignsProcessed += 1
        summary.results.push(result)
      } catch (error) {
        summary.failed += 1
        summary.results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: 'failed',
          message: error.message,
        })
      }
    }

    return summary
  })
}

export function getAutomationStatus() {
  return {
    config: automationConfig(),
    state: automationState,
    safety: {
      liveSendingEnabled: env.emailSend.mode === 'live' && env.emailSend.liveApproved,
      sendsEmails: false,
      message:
        'Background automation checks replies, marks no-replies, and creates follow-up drafts for approval. It does not send emails.',
    },
  }
}

export async function runBackgroundAutomationCycle(options = {}) {
  if (automationState.running) {
    return {
      skipped: true,
      reason: 'already_running',
      state: automationState,
    }
  }

  const config = automationConfig(options)
  const startedAt = new Date().toISOString()
  automationState.running = true
  automationState.lastStartedAt = startedAt
  automationState.lastError = null

  try {
    const supabase = getSupabaseClient()
    const workspaceIds = await listWorkspaceIds(supabase)
    const result = {
      trigger: options.trigger || 'manual',
      startedAt,
      finishedAt: null,
      config,
      workspacesFound: workspaceIds.length,
      workspacesProcessed: 0,
      failed: 0,
      workspaceResults: [],
    }

    for (const workspaceId of workspaceIds) {
      try {
        const workspaceResult = await processWorkspace(workspaceId, config)
        result.workspacesProcessed += 1
        result.workspaceResults.push(workspaceResult)
      } catch (error) {
        result.failed += 1
        result.workspaceResults.push({
          workspaceId,
          status: 'failed',
          message: error.message,
        })
      }
    }

    result.finishedAt = new Date().toISOString()
    automationState.lastFinishedAt = result.finishedAt
    automationState.lastResult = result

    return result
  } catch (error) {
    automationState.lastError = error.message
    throw error
  } finally {
    automationState.running = false
  }
}
