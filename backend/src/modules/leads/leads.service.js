import { createSupabaseServiceClient } from '../../config/supabase.js'
import { scopeWorkspace } from '../../middleware/workspace.js'

const leadSelect = `
  id,
  name,
  email,
  phone,
  company,
  website,
  linkedin_url,
  location,
  source,
  status,
  tags,
  score,
  normalized_email,
  dedupe_key,
  duplicate_of_lead_id,
  last_imported_at,
  created_at
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

function normalizeTags(tags = []) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
  }

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}

function mapLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    website: row.website,
    linkedinUrl: row.linkedin_url,
    location: row.location,
    source: row.source,
    status: row.status,
    tags: row.tags || [],
    score: row.score || 0,
    normalizedEmail: row.normalized_email,
    dedupeKey: row.dedupe_key,
    duplicateOfLeadId: row.duplicate_of_lead_id,
    lastImportedAt: row.last_imported_at,
    createdAt: row.created_at,
  }
}

function applyLeadFilters(query, filters = {}) {
  let nextQuery = query
  const search = String(filters.search || '').trim()

  if (search) {
    const pattern = `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
    nextQuery = nextQuery.or(
      `name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern},phone.ilike.${pattern},source.ilike.${pattern}`,
    )
  }

  if (filters.status) {
    nextQuery = nextQuery.eq('status', filters.status)
  }

  if (filters.source) {
    nextQuery = nextQuery.ilike('source', `%${String(filters.source).trim()}%`)
  }

  const tags = normalizeTags(filters.tags)
  if (tags.length) {
    nextQuery = nextQuery.contains('tags', tags)
  }

  if (filters.minScore !== undefined && filters.minScore !== '') {
    nextQuery = nextQuery.gte('score', Number(filters.minScore))
  }

  if (filters.maxScore !== undefined && filters.maxScore !== '') {
    nextQuery = nextQuery.lte('score', Number(filters.maxScore))
  }

  if (filters.duplicates === 'only') {
    nextQuery = nextQuery.not('duplicate_of_lead_id', 'is', null)
  } else if (filters.duplicates === 'exclude') {
    nextQuery = nextQuery.is('duplicate_of_lead_id', null)
  }

  return nextQuery
}

export async function listImportedLeads(filters = {}) {
  const supabase = getSupabaseClient()
  const limit = Math.min(Math.max(Number(filters.limit || 250), 1), 500)

  const query = applyLeadFilters(
    scopeWorkspace(
      supabase.from('leads').select(leadSelect),
    ),
    filters,
  )
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error: leadsError } = await query

  if (leadsError) {
    const error = new Error(leadsError.message)
    error.statusCode = 500
    throw error
  }

  return (data || []).map(mapLead)
}

export async function updateLeadMetadata(leadId, payload = {}) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
    updates.tags = normalizeTags(payload.tags)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'score')) {
    const score = Number(payload.score)

    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw createHttpError('score must be an integer between 0 and 100.')
    }

    updates.score = score
  }

  if (!Object.keys(updates).length) {
    throw createHttpError('No lead metadata fields provided to update.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase.from('leads').update(updates),
  )
    .eq('id', leadId)
    .select(leadSelect)
    .single()

  if (error) {
    throw createHttpError(error.code === 'PGRST116' ? 'Lead not found.' : error.message, error.code === 'PGRST116' ? 404 : 500)
  }

  return mapLead(data)
}

export async function getLeadDuplicateSummary() {
  const supabase = getSupabaseClient()
  const { data, error } = await scopeWorkspace(
    supabase
      .from('leads')
      .select('id, name, email, phone, company, source, duplicate_of_lead_id, dedupe_key, created_at'),
  )
    .not('dedupe_key', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  const groups = new Map()

  for (const lead of data || []) {
    const key = lead.dedupe_key
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(lead)
  }

  return [...groups.entries()]
    .filter(([, leads]) => leads.length > 1)
    .map(([dedupeKey, leads]) => ({
      dedupeKey,
      count: leads.length,
      leads,
    }))
}
