import { createSupabaseServiceClient } from '../../config/supabase.js'
import { scopeWorkspace } from '../../middleware/workspace.js'

const auditLogSelect = `
  id,
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at,
  team_members (
    id,
    full_name,
    email
  )
`

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  return supabase
}

function mapAuditLog(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.team_members?.full_name || '',
    actorEmail: row.team_members?.email || '',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }
}

export async function listAuditLogs(filters = {}) {
  const supabase = getSupabaseClient()
  const limit = Math.min(Math.max(Number(filters.limit || 100), 1), 250)

  let query = scopeWorkspace(
    supabase.from('audit_logs').select(auditLogSelect),
  )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.action) {
    query = query.ilike('action', `%${String(filters.action).trim()}%`)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', String(filters.entityType).trim())
  }

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map(mapAuditLog)
}
