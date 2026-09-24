import { createSupabaseServiceClient } from '../../config/supabase.js'
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

function rate(numerator, denominator) {
  if (!denominator) return 0
  return Number(((numerator / denominator) * 100).toFixed(2))
}

function indexBy(rows = [], key) {
  return rows.reduce((map, row) => {
    map.set(row[key], row)
    return map
  }, new Map())
}

function countBy(rows = [], key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

async function fetchRows(supabase, table, select, apply = (query) => query) {
  const { data, error } = await apply(scopeWorkspace(supabase.from(table).select(select)))

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getAnalyticsOverview() {
  const supabase = getSupabaseClient()
  const [campaigns, campaignLeads, sentEmails, replies, drafts] = await Promise.all([
    fetchRows(supabase, 'campaigns', 'id, name, status'),
    fetchRows(supabase, 'campaign_leads', 'id, campaign_id, outreach_status'),
    fetchRows(
      supabase,
      'sent_emails',
      'id, campaign_id, email_account_id, status, sent_at, no_reply_marked_at',
    ),
    fetchRows(supabase, 'replies', 'id, campaign_id, sent_email_id, email_account_id'),
    fetchRows(supabase, 'email_drafts', 'id, campaign_id, status, type, ai_generated'),
  ])

  const totalSent = sentEmails.length
  const totalReplies = replies.length
  const totalNoReplies = sentEmails.filter((email) => email.status === 'no_reply').length
  const approvedDrafts = drafts.filter((draft) => draft.status === 'approved').length

  return {
    totals: {
      campaigns: campaigns.length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
      campaignLeads: campaignLeads.length,
      sentEmails: totalSent,
      replies: totalReplies,
      noReplies: totalNoReplies,
      drafts: drafts.length,
      approvedDrafts,
      aiDrafts: drafts.filter((draft) => draft.ai_generated).length,
    },
    rates: {
      sendRate: rate(totalSent, campaignLeads.length),
      replyRate: rate(totalReplies, totalSent),
      noReplyRate: rate(totalNoReplies, totalSent),
      draftApprovalRate: rate(approvedDrafts, drafts.length),
      openRate: null,
    },
    tracking: {
      opensTracked: false,
      openRateMessage:
        'Open tracking is not implemented yet, so open rate is intentionally reported as null.',
    },
  }
}

export async function getCampaignPerformance() {
  const supabase = getSupabaseClient()
  const [campaigns, campaignLeads, sentEmails, replies, drafts] = await Promise.all([
    fetchRows(supabase, 'campaigns', 'id, name, status'),
    fetchRows(supabase, 'campaign_leads', 'id, campaign_id, outreach_status'),
    fetchRows(supabase, 'sent_emails', 'id, campaign_id, status'),
    fetchRows(supabase, 'replies', 'id, campaign_id, sent_email_id'),
    fetchRows(supabase, 'email_drafts', 'id, campaign_id, status, ai_generated'),
  ])

  return campaigns.map((campaign) => {
    const campaignLeadRows = campaignLeads.filter((row) => row.campaign_id === campaign.id)
    const sentRows = sentEmails.filter((row) => row.campaign_id === campaign.id)
    const replyRows = replies.filter((row) => row.campaign_id === campaign.id)
    const draftRows = drafts.filter((row) => row.campaign_id === campaign.id)
    const noReplyRows = sentRows.filter((row) => row.status === 'no_reply')
    const approvedDrafts = draftRows.filter((row) => row.status === 'approved')

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      leads: campaignLeadRows.length,
      sentEmails: sentRows.length,
      replies: replyRows.length,
      noReplies: noReplyRows.length,
      drafts: draftRows.length,
      approvedDrafts: approvedDrafts.length,
      aiDrafts: draftRows.filter((row) => row.ai_generated).length,
      outreachStatus: countBy(campaignLeadRows, 'outreach_status'),
      rates: {
        sendRate: rate(sentRows.length, campaignLeadRows.length),
        replyRate: rate(replyRows.length, sentRows.length),
        noReplyRate: rate(noReplyRows.length, sentRows.length),
        draftApprovalRate: rate(approvedDrafts.length, draftRows.length),
        openRate: null,
      },
    }
  })
}

export async function getSenderPerformance() {
  const supabase = getSupabaseClient()
  const [accounts, sentEmails, replies] = await Promise.all([
    fetchRows(supabase, 'email_accounts', 'id, email_address, provider, status, is_enabled'),
    fetchRows(
      supabase,
      'sent_emails',
      'id, email_account_id, status, sent_at, no_reply_marked_at',
    ),
    fetchRows(supabase, 'replies', 'id, sent_email_id, email_account_id'),
  ])
  const accountsById = indexBy(accounts, 'id')
  const missingAccountIds = [
    ...new Set(
      sentEmails
        .map((row) => row.email_account_id)
        .filter((accountId) => accountId && !accountsById.has(accountId)),
    ),
  ]

  return accounts.map((account) => {
    const sentRows = sentEmails.filter((row) => row.email_account_id === account.id)
    const replyRows = replies.filter((row) => row.email_account_id === account.id)
    const noReplyRows = sentRows.filter((row) => row.status === 'no_reply')

    return {
      emailAccountId: account.id,
      emailAddress: account.email_address,
      provider: account.provider,
      status: account.status,
      enabled: account.is_enabled,
      sentEmails: sentRows.length,
      replies: replyRows.length,
      noReplies: noReplyRows.length,
      rates: {
        replyRate: rate(replyRows.length, sentRows.length),
        noReplyRate: rate(noReplyRows.length, sentRows.length),
        openRate: null,
      },
    }
  }).concat(
    missingAccountIds.map((accountId) => {
      const sentRows = sentEmails.filter((row) => row.email_account_id === accountId)
      const replyRows = replies.filter((reply) => reply.email_account_id === accountId)
      const noReplyRows = sentRows.filter((row) => row.status === 'no_reply')

      return {
        emailAccountId: accountId,
        emailAddress: 'Unknown account',
        provider: 'unknown',
        status: 'missing',
        enabled: false,
        sentEmails: sentRows.length,
        replies: replyRows.length,
        noReplies: noReplyRows.length,
        rates: {
          replyRate: rate(replyRows.length, sentRows.length),
          noReplyRate: rate(noReplyRows.length, sentRows.length),
          openRate: null,
        },
      }
    }),
  )
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows, columns) {
  return [
    columns.map((column) => csvEscape(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(',')),
  ].join('\n')
}

export async function exportAnalyticsReport(reportType = 'campaigns') {
  if (reportType === 'senders') {
    const rows = await getSenderPerformance()
    return {
      filename: `lead-rubyorbit-sender-performance-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: toCsv(rows, [
        { label: 'Sender Email', value: (row) => row.emailAddress },
        { label: 'Provider', value: (row) => row.provider },
        { label: 'Status', value: (row) => row.status },
        { label: 'Enabled', value: (row) => row.enabled },
        { label: 'Sent Emails', value: (row) => row.sentEmails },
        { label: 'Replies', value: (row) => row.replies },
        { label: 'No Replies', value: (row) => row.noReplies },
        { label: 'Reply Rate', value: (row) => row.rates.replyRate },
        { label: 'No Reply Rate', value: (row) => row.rates.noReplyRate },
      ]),
    }
  }

  const rows = await getCampaignPerformance()
  return {
    filename: `lead-rubyorbit-campaign-performance-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: toCsv(rows, [
      { label: 'Campaign Name', value: (row) => row.campaignName },
      { label: 'Status', value: (row) => row.status },
      { label: 'Leads', value: (row) => row.leads },
      { label: 'Sent Emails', value: (row) => row.sentEmails },
      { label: 'Replies', value: (row) => row.replies },
      { label: 'No Replies', value: (row) => row.noReplies },
      { label: 'Drafts', value: (row) => row.drafts },
      { label: 'Approved Drafts', value: (row) => row.approvedDrafts },
      { label: 'AI Drafts', value: (row) => row.aiDrafts },
      { label: 'Send Rate', value: (row) => row.rates.sendRate },
      { label: 'Reply Rate', value: (row) => row.rates.replyRate },
      { label: 'No Reply Rate', value: (row) => row.rates.noReplyRate },
      { label: 'Draft Approval Rate', value: (row) => row.rates.draftApprovalRate },
    ]),
  }
}
