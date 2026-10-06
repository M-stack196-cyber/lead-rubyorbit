import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { env } from '../src/config/env.js'
import { createGhlClient } from '../src/modules/ghl/ghl.client.js'
import {
  getGhlStatus,
  setGhlSupabaseFactoryForTests,
  syncCampaignLeadsToGhl,
} from '../src/modules/ghl/ghl.service.js'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  setGhlSupabaseFactoryForTests(null)
  env.ghl.mode = 'mock'
  env.ghl.privateIntegrationToken = ''
  env.ghl.locationId = ''
  env.ghl.workflowId = ''
  env.ghl.pipelineId = ''
  env.ghl.pipelineStageId = ''
  env.ghl.apiBaseUrl = 'https://services.leadconnectorhq.com'
})

function createCampaignRow(overrides = {}) {
  return {
    id: 'campaign-1',
    workspace_id: 'workspace-1',
    name: 'Growth Campaign',
    description: 'Book meetings',
    status: 'active',
    ghl_workflow_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createCampaignLeadRow(overrides = {}) {
  return {
    id: 'campaign-lead-1',
    workspace_id: 'workspace-1',
    campaign_id: 'campaign-1',
    lead_id: 'lead-1',
    ghl_contact_id: null,
    ghl_sync_status: 'pending',
    ghl_sync_error: null,
    ghl_synced_at: null,
    ghl_workflow_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    campaigns: {
      id: 'campaign-1',
      name: 'Growth Campaign',
    },
    leads: {
      id: 'lead-1',
      name: 'Ruby Orbit',
      email: 'ruby@example.com',
      phone: '+15551234567',
      company: 'Orbit Co',
      source: 'import',
    },
    ...overrides,
  }
}

function createMockSupabase({
  campaigns = [createCampaignRow()],
  campaignLeads = [createCampaignLeadRow()],
} = {}) {
  const tables = {
    campaigns: [...campaigns],
    campaign_leads: [...campaignLeads],
  }
  const calls = []

  function createQuery(table) {
    const state = {
      filters: [],
      updateValues: null,
      orderBy: null,
    }

    const query = {
      eq(field, value) {
        state.filters.push([field, value])
        calls.push(['eq', table, field, value])
        return query
      },
      order(field, options) {
        state.orderBy = [field, options || {}]
        return query
      },
      select(columns) {
        calls.push(['select', table, columns])
        return query
      },
      single() {
        const rows = matchingRows()
        return Promise.resolve({
          data: rows[0] || null,
          error: rows[0] ? null : { code: 'PGRST116', message: 'No rows found.' },
        })
      },
      update(values) {
        state.updateValues = values
        calls.push(['update', table, values])
        return query
      },
      then(resolve, reject) {
        return Promise.resolve(execute()).then(resolve, reject)
      },
    }

    function matchingRows() {
      let rows = tables[table].filter((row) =>
        state.filters.every(([field, value]) => row[field] === value),
      )

      if (state.orderBy) {
        const [field, options] = state.orderBy
        rows = [...rows].sort((left, right) => {
          if (left[field] === right[field]) return 0
          const direction = options.ascending === false ? -1 : 1
          return left[field] > right[field] ? direction : -direction
        })
      }

      return rows
    }

    function execute() {
      const rows = matchingRows()

      if (state.updateValues) {
        rows.forEach((row) => Object.assign(row, state.updateValues))
      }

      return {
        data: rows,
        error: null,
      }
    }

    return query
  }

  return {
    tables,
    calls,
    from(table) {
      return createQuery(table)
    },
  }
}

function useMockSupabase(seed) {
  const supabase = createMockSupabase(seed)
  setGhlSupabaseFactoryForTests(() => supabase)
  return supabase
}

test('GHL mock mode sync does not call fetch', async () => {
  const supabase = useMockSupabase()
  let fetchCalled = false
  global.fetch = async () => {
    fetchCalled = true
    throw new Error('fetch should not be called')
  }

  const result = await syncCampaignLeadsToGhl('workspace-1', 'campaign-1')

  assert.equal(fetchCalled, false)
  assert.equal(result.synced, 1)
  assert.equal(supabase.tables.campaign_leads[0].ghl_contact_id, 'mock_ghl_contact_campaign-lead-1')
})

test('GHL live mode blocks when token is missing', () => {
  env.ghl.mode = 'live'
  env.ghl.locationId = 'location-1'

  assert.throws(() => createGhlClient(), /GHL_PRIVATE_INTEGRATION_TOKEN/)
})

test('GHL live mode blocks when location id is missing', () => {
  env.ghl.mode = 'live'
  env.ghl.privateIntegrationToken = 'secret-token'

  assert.throws(() => createGhlClient(), /GHL_LOCATION_ID/)
})

test('GHL live mode creates contact successfully and stores returned contact id', async () => {
  const supabase = useMockSupabase()
  const fetchCalls = []
  env.ghl.mode = 'live'
  env.ghl.privateIntegrationToken = 'secret-token'
  env.ghl.locationId = 'location-1'
  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options })
    return {
      ok: true,
      status: 200,
      async json() {
        return { contact: { id: 'ghl-contact-1' } }
      },
    }
  }

  const result = await syncCampaignLeadsToGhl('workspace-1', 'campaign-1')

  assert.equal(result.synced, 1)
  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0].url, 'https://services.leadconnectorhq.com/contacts/')
  assert.equal(fetchCalls[0].options.headers.Authorization, 'Bearer secret-token')
  assert.equal(fetchCalls[0].options.headers.Version, '2021-07-28')
  assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
    locationId: 'location-1',
    name: 'Ruby Orbit',
    email: 'ruby@example.com',
    phone: '+15551234567',
    source: 'LeadRubyOrbit',
    tags: ['Growth Campaign', 'import', 'rubyorbit'],
  })
  assert.equal(supabase.tables.campaign_leads[0].ghl_sync_status, 'synced')
  assert.equal(supabase.tables.campaign_leads[0].ghl_contact_id, 'ghl-contact-1')
  assert.equal(supabase.tables.campaign_leads[0].ghl_sync_error, null)
})

test('GHL live mode failure stores safe error', async () => {
  const supabase = useMockSupabase()
  env.ghl.mode = 'live'
  env.ghl.privateIntegrationToken = 'secret-token'
  env.ghl.locationId = 'location-1'
  global.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { message: 'secret-token should not be stored' }
    },
  })

  const result = await syncCampaignLeadsToGhl('workspace-1', 'campaign-1')

  assert.equal(result.failed, 1)
  assert.equal(supabase.tables.campaign_leads[0].ghl_sync_status, 'failed')
  assert.equal(supabase.tables.campaign_leads[0].ghl_sync_error, 'GHL request failed with status 401.')
  assert.equal(supabase.tables.campaign_leads[0].ghl_sync_error.includes('secret-token'), false)
})

test('GHL status payload never returns token value', () => {
  env.ghl.mode = 'live'
  env.ghl.privateIntegrationToken = 'secret-token'
  env.ghl.locationId = 'location-1'

  const status = getGhlStatus('workspace-1')

  assert.equal(JSON.stringify(status).includes('secret-token'), false)
  assert.deepEqual(status.credentials.privateIntegrationToken, true)
})

test('GHL workflow enrollment is called only when GHL_WORKFLOW_ID exists', async () => {
  useMockSupabase()
  const fetchCalls = []
  env.ghl.mode = 'live'
  env.ghl.privateIntegrationToken = 'secret-token'
  env.ghl.locationId = 'location-1'
  global.fetch = async (url) => {
    fetchCalls.push(url)
    return {
      ok: true,
      status: 200,
      async json() {
        return { contact: { id: 'ghl-contact-1' } }
      },
    }
  }

  await syncCampaignLeadsToGhl('workspace-1', 'campaign-1')
  assert.equal(fetchCalls.some((url) => url.includes('/workflow/')), false)

  useMockSupabase()
  fetchCalls.length = 0
  env.ghl.workflowId = 'workflow-1'
  await syncCampaignLeadsToGhl('workspace-1', 'campaign-1')

  assert.equal(fetchCalls.some((url) => url.includes('/contacts/ghl-contact-1/workflow/workflow-1')), true)
})
