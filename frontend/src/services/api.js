const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || `API request failed with status ${response.status}`)
  }

  return payload
}

export async function getBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)

  return parseApiResponse(response)
}

export async function uploadLeadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/upload`, {
    method: 'POST',
    body: formData,
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getLeadUploadPreview(uploadId) {
  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/${uploadId}/preview`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function confirmLeadUpload(uploadId) {
  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/${uploadId}/confirm`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaigns() {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createCampaign(campaign) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaign),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignById(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function updateCampaign(campaignId, campaign) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaign),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function addLeadsToCampaign(campaignId, leadIds) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ leadIds }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignLeads(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/leads`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getLeads() {
  const response = await fetch(`${API_BASE_URL}/api/leads`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getGhlSettingsStatus() {
  const response = await fetch(`${API_BASE_URL}/api/ghl/settings/status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function syncCampaignToGhl(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/ghl/campaigns/${campaignId}/sync`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function retryFailedGhlSync(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/ghl/campaigns/${campaignId}/retry-failed`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignGhlSyncStatus(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/ghl/campaigns/${campaignId}/sync-status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getEmailDrafts() {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createEmailDraft(draft) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getEmailDraftById(draftId) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function updateEmailDraft(draftId, draft) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function approveEmailDraft(draftId) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}/approve`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function rejectEmailDraft(draftId, rejectedReason) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectedReason }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function submitEmailDraftForApproval(draftId) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}/submit-for-approval`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function sendReplyDraft(draftId, emailAccountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/${draftId}/send-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emailAccountId }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignEmailDrafts(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/email-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getReplyDrafts() {
  const response = await fetch(`${API_BASE_URL}/api/email-drafts/reply-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignReplyDrafts(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/reply-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getReplyReplyDrafts(replyId) {
  const response = await fetch(`${API_BASE_URL}/api/replies/${replyId}/reply-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getEmailAccounts() {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createEmailAccount(account) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(account),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getEmailAccountById(accountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function updateEmailAccount(accountId, account) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(account),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function enableEmailAccount(accountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}/enable`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function disableEmailAccount(accountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}/disable`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function archiveEmailAccount(accountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}/archive`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getGmailStatus() {
  const response = await fetch(`${API_BASE_URL}/api/gmail/status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getGmailConnectUrl(emailAccountId) {
  const response = await fetch(`${API_BASE_URL}/api/gmail/connect/${emailAccountId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function disconnectGmailAccount(emailAccountId) {
  const response = await fetch(`${API_BASE_URL}/api/gmail/disconnect/${emailAccountId}`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getEmailSendingStatus() {
  const response = await fetch(`${API_BASE_URL}/api/email-sending/status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function sendEmailDraft(draftId, emailAccountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-sending/send-draft/${draftId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emailAccountId }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function sendCampaignEmails(campaignId, emailAccountId) {
  const response = await fetch(`${API_BASE_URL}/api/email-sending/send-campaign/${campaignId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emailAccountId }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignSentEmails(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/email-sending/campaigns/${campaignId}/sent-emails`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getReplyMonitoringStatus() {
  const response = await fetch(`${API_BASE_URL}/api/reply-monitoring/status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function checkSentEmailReplies(sentEmailId) {
  const response = await fetch(`${API_BASE_URL}/api/reply-monitoring/check-sent-email/${sentEmailId}`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function checkCampaignReplies(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/reply-monitoring/check-campaign/${campaignId}`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignReplies(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/reply-monitoring/campaigns/${campaignId}/replies`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getSentEmailReplies(sentEmailId) {
  const response = await fetch(`${API_BASE_URL}/api/reply-monitoring/sent-emails/${sentEmailId}/replies`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getNoReplyMonitoringStatus() {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function checkNoReplySentEmail(sentEmailId, timeoutDays) {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/check-sent-email/${sentEmailId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeoutDays }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function checkNoReplyCampaign(campaignId, timeoutDays) {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/check-campaign/${campaignId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeoutDays }),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignNoReplies(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/campaigns/${campaignId}/no-replies`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getSentEmailNoReplyStatus(sentEmailId) {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/sent-emails/${sentEmailId}/no-reply-status`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getFollowupDrafts() {
  const response = await fetch(`${API_BASE_URL}/api/followup-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getFollowupDraftById(draftId) {
  const response = await fetch(`${API_BASE_URL}/api/followup-drafts/${draftId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createFollowupDraft(draft) {
  const response = await fetch(`${API_BASE_URL}/api/followup-drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createFollowupDraftFromNoReply(sentEmailId, draft = {}) {
  const response = await fetch(`${API_BASE_URL}/api/followup-drafts/create-from-no-reply/${sentEmailId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignFollowupDrafts(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/followup-drafts`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignFollowupCandidates(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/no-reply-monitoring/campaigns/${campaignId}/followup-candidates`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getTeamDecisions() {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getTeamDecisionById(decisionId) {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions/${decisionId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createTeamDecision(decision) {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function updateTeamDecision(decisionId, decision) {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions/${decisionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function completeTeamDecision(decisionId, decision = {}) {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions/${decisionId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function cancelTeamDecision(decisionId) {
  const response = await fetch(`${API_BASE_URL}/api/team-decisions/${decisionId}/cancel`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignTeamDecisions(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/team-decisions`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getNotifications(filters = {}) {
  const response = await fetch(`${API_BASE_URL}/api/notifications${buildQuery(filters)}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getNotificationSummary() {
  const response = await fetch(`${API_BASE_URL}/api/notifications/summary`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getNotificationById(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function createNotification(notification) {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function markNotificationRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/mark-read`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function resolveNotification(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/resolve`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function archiveNotification(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/archive`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getCampaignNotifications(campaignId, filters = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/notifications${buildQuery(filters)}`,
  )

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function generateCampaignNotifications(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/generate/campaign/${campaignId}`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}
