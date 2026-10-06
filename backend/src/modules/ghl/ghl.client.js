import { env } from '../../config/env.js'
import { createGhlMockClient } from './ghl.mockClient.js'

const liveCredentialsError =
  'GHL live mode requires GHL_PRIVATE_INTEGRATION_TOKEN and GHL_LOCATION_ID.'
const ghlApiVersion = '2021-07-28'

export function getGhlSettingsStatus() {
  const mode = env.ghl.mode === 'live' ? 'live' : 'mock'
  const credentials = {
    privateIntegrationToken: Boolean(env.ghl.privateIntegrationToken),
    locationId: Boolean(env.ghl.locationId),
    workflowId: Boolean(env.ghl.workflowId),
    pipelineId: Boolean(env.ghl.pipelineId),
    pipelineStageId: Boolean(env.ghl.pipelineStageId),
  }
  const liveReady = credentials.privateIntegrationToken && credentials.locationId

  return {
    mode,
    apiBaseUrl: env.ghl.apiBaseUrl,
    credentials,
    credentialStatus: liveReady ? 'configured' : 'missing',
    liveReady,
    mockMode: mode === 'mock',
  }
}

export function createGhlClient() {
  const settings = getGhlSettingsStatus()

  if (settings.mode === 'mock') {
    return createGhlMockClient({ workflowId: env.ghl.workflowId })
  }

  if (!settings.liveReady) {
    const error = new Error(liveCredentialsError)
    error.statusCode = 400
    throw error
  }

  return createGhlLiveClient()
}

function createGhlLiveClient() {
  const apiBaseUrl = String(env.ghl.apiBaseUrl || 'https://services.leadconnectorhq.com').replace(
    /\/+$/,
    '',
  )

  async function request(path, { method = 'POST', body } = {}) {
    let response

    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${env.ghl.privateIntegrationToken}`,
          Version: ghlApiVersion,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch {
      const error = new Error('GHL request failed.')
      error.statusCode = 502
      throw error
    }

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const error = new Error(`GHL request failed with status ${response.status}.`)
      error.statusCode = response.status >= 500 ? 502 : 400
      throw error
    }

    return payload || {}
  }

  return {
    async createContact({ contact }) {
      const payload = await request('/contacts/', {
        body: contact,
      })
      const contactId =
        payload.contact?.id || payload.contact?.contactId || payload.id || payload.contactId

      if (!contactId) {
        const error = new Error('GHL contact response did not include a contact id.')
        error.statusCode = 502
        throw error
      }

      return {
        contactId,
        response: {
          contactId,
        },
      }
    },

    async enrollContactInWorkflow({ contactId, workflowId }) {
      await request(
        `/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(workflowId)}`,
      )
      return {
        workflowId,
        enrolled: true,
      }
    },

    async createOpportunity({ opportunity }) {
      const payload = await request('/opportunities/', {
        body: opportunity,
      })
      const opportunityId =
        payload.opportunity?.id ||
        payload.opportunity?.opportunityId ||
        payload.id ||
        payload.opportunityId ||
        null

      return {
        opportunityId,
        created: true,
      }
    },
  }
}
