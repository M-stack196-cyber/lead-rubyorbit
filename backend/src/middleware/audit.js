import { createSupabaseServiceClient } from '../config/supabase.js'
import { getCurrentWorkspaceId } from './workspace.js'

function getRequestId(req) {
  return req.get('x-request-id') || req.get('x-correlation-id') || null
}

export async function writeAuditLog({ req, action, entityType, entityId, statusCode, metadata = {} }) {
  const supabase = createSupabaseServiceClient()

  if (!supabase) return

  await supabase.from('audit_logs').insert({
    actor_id: req.auth?.teamMember?.id || null,
    workspace_id: req.workspace?.id || getCurrentWorkspaceId(),
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata: {
      result: statusCode < 400 ? 'success' : 'failed',
      statusCode,
      method: req.method,
      path: req.originalUrl,
      requestId: getRequestId(req),
      ...metadata,
    },
  })
}

export function auditAction(action, entityType, getEntityId = () => null) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 500) return

      const entityId = getEntityId(req)
      writeAuditLog({
        req,
        action,
        entityType,
        entityId,
        statusCode: res.statusCode,
      }).catch((error) => {
        console.warn('Failed to write audit log:', error.message)
      })
    })

    next()
  }
}
