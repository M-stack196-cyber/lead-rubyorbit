const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

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

export async function getCampaignEmailDrafts(campaignId) {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/email-drafts`)

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
