import { env } from '../../config/env.js'
import { createGhlMockClient } from './ghl.mockClient.js'

const liveCredentialsError =
  'GHL live mode requires GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID, and GHL_WORKFLOW_ID.'

export function getGhlSettingsStatus() {
  const mode = env.ghl.mode === 'live' ? 'live' : 'mock'
  const credentials = {
    privateIntegrationToken: Boolean(env.ghl.privateIntegrationToken),
    locationId: Boolean(env.ghl.locationId),
    workflowId: Boolean(env.ghl.workflowId),
  }
  const liveReady =
    credentials.privateIntegrationToken && credentials.locationId && credentials.workflowId

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
  return {
    async createContact() {
      // TODO: Implement real GoHighLevel contact creation with Private Integration Token.
      const error = new Error('GHL live contact creation is not implemented yet.')
      error.statusCode = 501
      throw error
    },

    async enrollContactInWorkflow() {
      // TODO: Implement real GoHighLevel workflow enrollment once credentials are available.
      const error = new Error('GHL live workflow enrollment is not implemented yet.')
      error.statusCode = 501
      throw error
    },
  }
}
