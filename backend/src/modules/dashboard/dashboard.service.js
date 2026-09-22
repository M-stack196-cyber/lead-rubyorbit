import { createSupabaseServiceClient } from '../../config/supabase.js'

const followupDraftTypes = ['follow_up', 'followup']

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

async function countRows(supabase, table, applyFilters) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (applyFilters) query = applyFilters(query)

  const { count, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return count || 0
}

async function fetchRows(supabase, table, select, applyFilters) {
  let query = supabase.from(table).select(select)
  if (applyFilters) query = applyFilters(query)

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data || []
}

async function fetchMaybeSingle(supabase, table, select, column, value, notFoundMessage) {
  const { data, error } = await supabase.from(table).select(select).eq(column, value).maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  if (!data) {
    throw createHttpError(notFoundMessage, 404)
  }

  return data
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function toActivityItem({
  id,
  type,
  title,
  description,
  occurredAt,
  campaignId = null,
  leadId = null,
  campaignLeadId = null,
  relatedIds = {},
  metadata = {},
}) {
  return {
    id: `${type}:${id}`,
    type,
    title,
    description,
    occurredAt,
    campaignId,
    leadId,
    campaignLeadId,
    relatedIds,
    metadata,
  }
}

function sortByOccurredAtDesc(items) {
  return items
    .filter((item) => item.occurredAt)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

function sortByOccurredAtAsc(items) {
  return items
    .filter((item) => item.occurredAt)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
}

function formatStatus(value) {
  return String(value || 'unknown').replaceAll('_', ' ')
}

function leadDisplay(lead) {
  if (!lead) return 'lead'
  return lead.name || lead.email || 'lead'
}

function campaignDisplay(campaign) {
  if (!campaign) return 'campaign'
  return campaign.name || 'campaign'
}

async function getLeadsById(supabase, leadIds = []) {
  const ids = [...new Set(leadIds.filter(Boolean))]
  if (!ids.length) return new Map()

  const rows = await fetchRows(
    supabase,
    'leads',
    'id, name, email, company, status, source, created_at',
    (query) => query.in('id', ids),
  )

  return new Map(rows.map((lead) => [lead.id, lead]))
}

async function getCampaignsById(supabase, campaignIds = []) {
  const ids = [...new Set(campaignIds.filter(Boolean))]
  if (!ids.length) return new Map()

  const rows = await fetchRows(
    supabase,
    'campaigns',
    'id, name, description, status, created_at, updated_at',
    (query) => query.in('id', ids),
  )

  return new Map(rows.map((campaign) => [campaign.id, campaign]))
}

function mapCampaignLeadActivity(row, leadsById, campaignsById) {
  const lead = leadsById.get(row.lead_id)
  const campaign = campaignsById.get(row.campaign_id)

  return toActivityItem({
    id: row.id,
    type: 'lead_added',
    title: `Lead added to ${campaignDisplay(campaign)}`,
    description: `${leadDisplay(lead)} was attached to this campaign.`,
    occurredAt: row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.id,
    metadata: {
      outreachStatus: row.outreach_status,
      ghlSyncStatus: row.ghl_sync_status,
    },
  })
}

function mapDraftActivity(row, leadsById) {
  const isReply = row.type === 'reply'
  const isFollowup = followupDraftTypes.includes(row.type)

  return toActivityItem({
    id: row.id,
    type: isReply ? 'reply_draft_created' : isFollowup ? 'followup_draft_created' : 'draft_created',
    title: isReply ? 'Reply draft created' : isFollowup ? 'Follow-up draft created' : 'Draft created',
    description: row.subject || `Draft for ${leadDisplay(leadsById.get(row.lead_id))}.`,
    occurredAt: row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    relatedIds: {
      emailDraftId: row.id,
      replyId: row.reply_id,
      sentEmailId: row.sent_email_id,
      sourceNoReplySentEmailId: row.source_no_reply_sent_email_id,
    },
    metadata: {
      draftType: row.type,
      status: row.status,
      followupNumber: row.followup_number,
    },
  })
}

function mapSentEmailActivity(row, leadsById) {
  const noReplyMarkedAt = row.no_reply_marked_at || (row.status === 'no_reply' ? row.updated_at : null)

  if (row.status === 'no_reply' && noReplyMarkedAt) {
    return toActivityItem({
      id: row.id,
      type: 'no_reply_detected',
      title: 'No reply detected',
      description: row.subject || `No reply from ${leadDisplay(leadsById.get(row.lead_id))}.`,
      occurredAt: noReplyMarkedAt,
      campaignId: row.campaign_id,
      leadId: row.lead_id,
      campaignLeadId: row.campaign_lead_id,
      relatedIds: {
        sentEmailId: row.id,
        emailDraftId: row.email_draft_id,
      },
      metadata: {
        status: row.status,
        sentAt: row.sent_at,
      },
    })
  }

  return toActivityItem({
    id: row.id,
    type: 'email_sent',
    title: 'Email sent',
    description: row.subject || `Email sent to ${leadDisplay(leadsById.get(row.lead_id))}.`,
    occurredAt: row.sent_at || row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    relatedIds: {
      sentEmailId: row.id,
      emailDraftId: row.email_draft_id,
    },
    metadata: {
      status: row.status,
      toEmail: row.to_email,
      fromEmail: row.from_email,
    },
  })
}

function mapReplyActivity(row, leadsById) {
  return toActivityItem({
    id: row.id,
    type: 'reply_received',
    title: 'Reply received',
    description: row.subject || `Reply from ${leadDisplay(leadsById.get(row.lead_id))}.`,
    occurredAt: row.received_at || row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    relatedIds: {
      replyId: row.id,
      sentEmailId: row.sent_email_id,
    },
    metadata: {
      fromEmail: row.from_email,
      toEmail: row.to_email,
    },
  })
}

function mapTeamDecisionActivity(row, leadsById) {
  const completed = row.status === 'completed'

  return toActivityItem({
    id: `${row.id}:${completed ? 'completed' : 'created'}`,
    type: completed ? 'team_decision_completed' : 'team_decision_created',
    title: completed ? 'Team decision completed' : 'Team decision created',
    description:
      row.notes ||
      `${formatStatus(row.decision_type || row.action)} decision for ${leadDisplay(leadsById.get(row.lead_id))}.`,
    occurredAt: completed ? row.resolved_at || row.updated_at : row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    relatedIds: {
      teamDecisionId: row.id,
      replyId: row.reply_id,
      sentEmailId: row.sent_email_id,
    },
    metadata: {
      status: row.status,
      decisionType: row.decision_type || row.action,
      reason: row.reason,
    },
  })
}

function mapNotificationActivity(row) {
  return toActivityItem({
    id: row.id,
    type: 'notification_created',
    title: row.title || 'Notification created',
    description: row.message || formatStatus(row.type),
    occurredAt: row.created_at,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    campaignLeadId: row.campaign_lead_id,
    relatedIds: {
      notificationId: row.id,
      replyId: row.reply_id,
      sentEmailId: row.sent_email_id,
      emailDraftId: row.email_draft_id,
      teamDecisionId: row.team_decision_id,
    },
    metadata: {
      type: row.type,
      status: row.status,
      priority: row.priority,
    },
  })
}

async function getCampaignActivityRows(supabase, campaignId) {
  const [campaignLeads, drafts, sentEmails, replies, decisions, notifications] = await Promise.all([
    fetchRows(
      supabase,
      'campaign_leads',
      'id, campaign_id, lead_id, outreach_status, ghl_sync_status, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'email_drafts',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, source_no_reply_sent_email_id, type, subject, status, followup_number, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'sent_emails',
      'id, email_draft_id, campaign_id, lead_id, campaign_lead_id, to_email, from_email, subject, status, sent_at, no_reply_marked_at, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'replies',
      'id, sent_email_id, campaign_id, lead_id, campaign_lead_id, from_email, to_email, subject, received_at, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'team_decisions',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, reason, decision_type, action, status, notes, resolved_at, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'notifications',
      'id, type, title, message, status, priority, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, email_draft_id, team_decision_id, created_at, updated_at',
      (query) => query.eq('campaign_id', campaignId),
    ),
  ])

  return { campaignLeads, drafts, sentEmails, replies, decisions, notifications }
}

async function buildCampaignActivity(supabase, campaignId) {
  const rows = await getCampaignActivityRows(supabase, campaignId)
  const leadIds = [
    ...rows.campaignLeads.map((row) => row.lead_id),
    ...rows.drafts.map((row) => row.lead_id),
    ...rows.sentEmails.map((row) => row.lead_id),
    ...rows.replies.map((row) => row.lead_id),
    ...rows.decisions.map((row) => row.lead_id),
    ...rows.notifications.map((row) => row.lead_id),
  ]
  const [leadsById, campaignsById] = await Promise.all([
    getLeadsById(supabase, leadIds),
    getCampaignsById(supabase, [campaignId]),
  ])

  const items = [
    ...rows.campaignLeads.map((row) => mapCampaignLeadActivity(row, leadsById, campaignsById)),
    ...rows.drafts.map((row) => mapDraftActivity(row, leadsById)),
    ...rows.sentEmails.map((row) => mapSentEmailActivity(row, leadsById)),
    ...rows.replies.map((row) => mapReplyActivity(row, leadsById)),
    ...rows.decisions.map((row) => mapTeamDecisionActivity(row, leadsById)),
    ...rows.notifications.map(mapNotificationActivity),
  ]

  return sortByOccurredAtDesc(items)
}

async function getCampaignLeadRow(supabase, campaignLeadId) {
  return fetchMaybeSingle(
    supabase,
    'campaign_leads',
    'id, campaign_id, lead_id, ghl_contact_id, ghl_sync_status, outreach_status, current_step, last_email_sent_at, reply_detected_at, last_no_reply_checked_at, next_followup_due_at, followup_count, last_followup_draft_id, created_at, updated_at',
    'id',
    campaignLeadId,
    'Campaign lead not found.',
  )
}

export async function getDashboardSummary() {
  const supabase = getSupabaseClient()

  const [
    totalCampaigns,
    activeCampaigns,
    totalLeads,
    campaignLeads,
    sentEmails,
    replies,
    noReplyEmails,
    pendingTeamDecisions,
    pendingApprovalDrafts,
    followupRequiredLeads,
    unreadNotifications,
    connectedEmailAccounts,
    recentCampaigns,
    recentNotifications,
    recentReplies,
    recentSentEmails,
  ] = await Promise.all([
    countRows(supabase, 'campaigns'),
    countRows(supabase, 'campaigns', (query) => query.eq('status', 'active')),
    countRows(supabase, 'leads'),
    countRows(supabase, 'campaign_leads'),
    countRows(supabase, 'sent_emails'),
    countRows(supabase, 'replies'),
    countRows(supabase, 'sent_emails', (query) => query.eq('status', 'no_reply')),
    countRows(supabase, 'team_decisions', (query) => query.eq('status', 'pending')),
    countRows(supabase, 'email_drafts', (query) => query.eq('status', 'pending_approval')),
    countRows(supabase, 'campaign_leads', (query) => query.eq('outreach_status', 'followup_required')),
    countRows(supabase, 'notifications', (query) => query.eq('status', 'unread')),
    countRows(supabase, 'email_accounts', (query) => query.eq('gmail_token_status', 'connected')),
    fetchRows(
      supabase,
      'campaigns',
      'id, name, description, status, created_at, updated_at',
      (query) => query.order('updated_at', { ascending: false }).limit(6),
    ),
    fetchRows(
      supabase,
      'notifications',
      'id, type, title, message, status, priority, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, email_draft_id, team_decision_id, created_at, updated_at',
      (query) => query.order('created_at', { ascending: false }).limit(8),
    ),
    fetchRows(
      supabase,
      'replies',
      'id, sent_email_id, campaign_id, lead_id, campaign_lead_id, from_email, to_email, subject, received_at, created_at, updated_at',
      (query) => query.order('created_at', { ascending: false }).limit(5),
    ),
    fetchRows(
      supabase,
      'sent_emails',
      'id, email_draft_id, campaign_id, lead_id, campaign_lead_id, to_email, from_email, subject, status, sent_at, no_reply_marked_at, created_at, updated_at',
      (query) => query.order('created_at', { ascending: false }).limit(5),
    ),
  ])

  const leadIds = [
    ...recentNotifications.map((row) => row.lead_id),
    ...recentReplies.map((row) => row.lead_id),
    ...recentSentEmails.map((row) => row.lead_id),
  ]
  const [leadsById, campaignsById] = await Promise.all([
    getLeadsById(supabase, leadIds),
    getCampaignsById(supabase, [
      ...recentNotifications.map((row) => row.campaign_id),
      ...recentReplies.map((row) => row.campaign_id),
      ...recentSentEmails.map((row) => row.campaign_id),
    ]),
  ])

  const recentActivity = sortByOccurredAtDesc([
    ...recentNotifications.map(mapNotificationActivity),
    ...recentReplies.map((row) => mapReplyActivity(row, leadsById)),
    ...recentSentEmails.map((row) => mapSentEmailActivity(row, leadsById)),
  ]).slice(0, 10)

  return {
    counts: {
      totalCampaigns,
      activeCampaigns,
      totalLeads,
      campaignLeads,
      sentEmails,
      replies,
      noReplyEmails,
      pendingTeamDecisions,
      pendingApprovalDrafts,
      followupRequiredLeads,
      unreadNotifications,
      connectedEmailAccounts,
    },
    recentCampaigns: recentCampaigns.map((campaign) => ({
      ...campaign,
      displayName: campaignDisplay(campaign),
    })),
    recentActivity: recentActivity.map((item) => ({
      ...item,
      campaignName: campaignDisplay(campaignsById.get(item.campaignId)),
      leadName: leadDisplay(leadsById.get(item.leadId)),
    })),
    notificationSummary: {
      unread: unreadNotifications,
      recent: recentNotifications.map((row) => mapNotificationActivity(row)),
    },
    pendingActions: {
      pendingTeamDecisions,
      pendingApprovalDrafts,
      followupRequiredLeads,
      unreadNotifications,
    },
  }
}

export async function getCampaignDashboardSummary(campaignId) {
  const supabase = getSupabaseClient()
  const campaign = await fetchMaybeSingle(
    supabase,
    'campaigns',
    'id, name, description, status, created_at, updated_at',
    'id',
    campaignId,
    'Campaign not found.',
  )

  const [campaignLeadRows, draftRows] = await Promise.all([
    fetchRows(
      supabase,
      'campaign_leads',
      'id, outreach_status',
      (query) => query.eq('campaign_id', campaignId),
    ),
    fetchRows(
      supabase,
      'email_drafts',
      'id, type, status',
      (query) => query.eq('campaign_id', campaignId),
    ),
  ])

  const [
    sentEmailsCount,
    repliesCount,
    noRepliesCount,
    pendingTeamDecisionsCount,
    notificationsCount,
    unreadNotificationsCount,
  ] = await Promise.all([
    countRows(supabase, 'sent_emails', (query) => query.eq('campaign_id', campaignId)),
    countRows(supabase, 'replies', (query) => query.eq('campaign_id', campaignId)),
    countRows(supabase, 'sent_emails', (query) => query.eq('campaign_id', campaignId).eq('status', 'no_reply')),
    countRows(supabase, 'team_decisions', (query) => query.eq('campaign_id', campaignId).eq('status', 'pending')),
    countRows(supabase, 'notifications', (query) => query.eq('campaign_id', campaignId)),
    countRows(supabase, 'notifications', (query) => query.eq('campaign_id', campaignId).eq('status', 'unread')),
  ])

  return {
    campaign,
    totalCampaignLeads: campaignLeadRows.length,
    leadsByOutreachStatus: countBy(campaignLeadRows, 'outreach_status'),
    sentEmailsCount,
    repliesCount,
    noRepliesCount,
    pendingTeamDecisionsCount,
    emailDraftsByStatus: countBy(draftRows, 'status'),
    replyDraftsCount: draftRows.filter((draft) => draft.type === 'reply').length,
    followupDraftsCount: draftRows.filter((draft) => followupDraftTypes.includes(draft.type)).length,
    notificationsCount,
    unreadNotificationsCount,
  }
}

export async function getCampaignActivity(campaignId) {
  const supabase = getSupabaseClient()
  await fetchMaybeSingle(
    supabase,
    'campaigns',
    'id',
    'id',
    campaignId,
    'Campaign not found.',
  )

  return {
    campaignId,
    items: await buildCampaignActivity(supabase, campaignId),
  }
}

export async function getLeadTimeline(leadId) {
  const supabase = getSupabaseClient()
  const lead = await fetchMaybeSingle(
    supabase,
    'leads',
    'id, name, email, company, status, source, created_at, updated_at',
    'id',
    leadId,
    'Lead not found.',
  )

  const campaignLeads = await fetchRows(
    supabase,
    'campaign_leads',
    'id, campaign_id, lead_id, outreach_status, ghl_sync_status, created_at, updated_at',
    (query) => query.eq('lead_id', leadId),
  )

  const campaignIds = campaignLeads.map((row) => row.campaign_id)
  const campaignsById = await getCampaignsById(supabase, campaignIds)
  const [drafts, sentEmails, replies, decisions, notifications] = await Promise.all([
    fetchRows(
      supabase,
      'email_drafts',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, source_no_reply_sent_email_id, type, subject, status, followup_number, created_at, updated_at',
      (query) => query.eq('lead_id', leadId),
    ),
    fetchRows(
      supabase,
      'sent_emails',
      'id, email_draft_id, campaign_id, lead_id, campaign_lead_id, to_email, from_email, subject, status, sent_at, no_reply_marked_at, created_at, updated_at',
      (query) => query.eq('lead_id', leadId),
    ),
    fetchRows(
      supabase,
      'replies',
      'id, sent_email_id, campaign_id, lead_id, campaign_lead_id, from_email, to_email, subject, received_at, created_at, updated_at',
      (query) => query.eq('lead_id', leadId),
    ),
    fetchRows(
      supabase,
      'team_decisions',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, reason, decision_type, action, status, notes, resolved_at, created_at, updated_at',
      (query) => query.eq('lead_id', leadId),
    ),
    fetchRows(
      supabase,
      'notifications',
      'id, type, title, message, status, priority, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, email_draft_id, team_decision_id, created_at, updated_at',
      (query) => query.eq('lead_id', leadId),
    ),
  ])

  const leadsById = new Map([[lead.id, lead]])
  const items = [
    toActivityItem({
      id: lead.id,
      type: 'lead_added',
      title: 'Lead created',
      description: lead.email ? `${leadDisplay(lead)} entered the workspace.` : 'Lead entered the workspace.',
      occurredAt: lead.created_at,
      leadId: lead.id,
      metadata: {
        source: lead.source,
        status: lead.status,
      },
    }),
    ...campaignLeads.map((row) => mapCampaignLeadActivity(row, leadsById, campaignsById)),
    ...drafts.map((row) => mapDraftActivity(row, leadsById)),
    ...sentEmails.map((row) => mapSentEmailActivity(row, leadsById)),
    ...replies.map((row) => mapReplyActivity(row, leadsById)),
    ...decisions.map((row) => mapTeamDecisionActivity(row, leadsById)),
    ...notifications.map(mapNotificationActivity),
  ]

  return {
    lead,
    items: sortByOccurredAtAsc(items),
  }
}

export async function getCampaignLeadTimeline(campaignLeadId) {
  const supabase = getSupabaseClient()
  const campaignLead = await getCampaignLeadRow(supabase, campaignLeadId)
  const [lead, campaign] = await Promise.all([
    fetchMaybeSingle(
      supabase,
      'leads',
      'id, name, email, company, status, source, created_at, updated_at',
      'id',
      campaignLead.lead_id,
      'Lead not found.',
    ),
    fetchMaybeSingle(
      supabase,
      'campaigns',
      'id, name, description, status, created_at, updated_at',
      'id',
      campaignLead.campaign_id,
      'Campaign not found.',
    ),
  ])

  const [drafts, sentEmails, replies, decisions, notifications] = await Promise.all([
    fetchRows(
      supabase,
      'email_drafts',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, source_no_reply_sent_email_id, type, subject, status, followup_number, created_at, updated_at',
      (query) => query.eq('campaign_lead_id', campaignLeadId),
    ),
    fetchRows(
      supabase,
      'sent_emails',
      'id, email_draft_id, campaign_id, lead_id, campaign_lead_id, to_email, from_email, subject, status, sent_at, no_reply_marked_at, created_at, updated_at',
      (query) => query.eq('campaign_lead_id', campaignLeadId),
    ),
    fetchRows(
      supabase,
      'replies',
      'id, sent_email_id, campaign_id, lead_id, campaign_lead_id, from_email, to_email, subject, received_at, created_at, updated_at',
      (query) => query.eq('campaign_lead_id', campaignLeadId),
    ),
    fetchRows(
      supabase,
      'team_decisions',
      'id, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, reason, decision_type, action, status, notes, resolved_at, created_at, updated_at',
      (query) => query.eq('campaign_lead_id', campaignLeadId),
    ),
    fetchRows(
      supabase,
      'notifications',
      'id, type, title, message, status, priority, campaign_id, lead_id, campaign_lead_id, reply_id, sent_email_id, email_draft_id, team_decision_id, created_at, updated_at',
      (query) => query.eq('campaign_lead_id', campaignLeadId),
    ),
  ])

  const leadsById = new Map([[lead.id, lead]])
  const campaignsById = new Map([[campaign.id, campaign]])
  const items = [
    mapCampaignLeadActivity(campaignLead, leadsById, campaignsById),
    toActivityItem({
      id: `${campaignLead.id}:ghl`,
      type: 'lead_added',
      title: 'GHL sync status',
      description: `GHL status is ${formatStatus(campaignLead.ghl_sync_status)}.`,
      occurredAt: campaignLead.updated_at || campaignLead.created_at,
      campaignId: campaignLead.campaign_id,
      leadId: campaignLead.lead_id,
      campaignLeadId: campaignLead.id,
      metadata: {
        ghlContactId: campaignLead.ghl_contact_id,
        ghlSyncStatus: campaignLead.ghl_sync_status,
        outreachStatus: campaignLead.outreach_status,
      },
    }),
    ...drafts.map((row) => mapDraftActivity(row, leadsById)),
    ...sentEmails.map((row) => mapSentEmailActivity(row, leadsById)),
    ...replies.map((row) => mapReplyActivity(row, leadsById)),
    ...decisions.map((row) => mapTeamDecisionActivity(row, leadsById)),
    ...notifications.map(mapNotificationActivity),
  ]

  return {
    campaign,
    lead,
    campaignLead,
    items: sortByOccurredAtAsc(items),
  }
}
