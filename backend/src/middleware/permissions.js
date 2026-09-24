import { env } from '../config/env.js'
import { writeAuditLog } from './audit.js'

export const permissions = {
  CAMPAIGN_WRITE: 'campaign:write',
  CAMPAIGN_SYNC: 'campaign:sync',
  LEAD_IMPORT: 'lead:import',
  EMAIL_ACCOUNT_MANAGE: 'email_account:manage',
  EMAIL_DRAFT_WRITE: 'email_draft:write',
  EMAIL_DRAFT_APPROVE: 'email_draft:approve',
  EMAIL_SEND: 'email:send',
  REPLY_CHECK: 'reply:check',
  NO_REPLY_CHECK: 'no_reply:check',
  FOLLOWUP_WRITE: 'followup:write',
  TEAM_DECISION_WRITE: 'team_decision:write',
  NOTIFICATION_WRITE: 'notification:write',
  GMAIL_MANAGE: 'gmail:manage',
  AUTOMATION_MANAGE: 'automation:manage',
  ANALYTICS_READ: 'analytics:read',
  AUDIT_LOG_READ: 'audit_log:read',
}

const rolePermissions = {
  admin: new Set(Object.values(permissions)),
  manager: new Set([
    permissions.CAMPAIGN_WRITE,
    permissions.CAMPAIGN_SYNC,
    permissions.LEAD_IMPORT,
    permissions.EMAIL_ACCOUNT_MANAGE,
    permissions.EMAIL_DRAFT_WRITE,
    permissions.EMAIL_DRAFT_APPROVE,
    permissions.EMAIL_SEND,
    permissions.REPLY_CHECK,
    permissions.NO_REPLY_CHECK,
    permissions.FOLLOWUP_WRITE,
    permissions.TEAM_DECISION_WRITE,
    permissions.NOTIFICATION_WRITE,
    permissions.AUTOMATION_MANAGE,
    permissions.ANALYTICS_READ,
  ]),
  operator: new Set([
    permissions.LEAD_IMPORT,
    permissions.EMAIL_DRAFT_WRITE,
    permissions.EMAIL_SEND,
    permissions.REPLY_CHECK,
    permissions.NO_REPLY_CHECK,
    permissions.FOLLOWUP_WRITE,
    permissions.TEAM_DECISION_WRITE,
    permissions.NOTIFICATION_WRITE,
    permissions.ANALYTICS_READ,
  ]),
  viewer: new Set([permissions.ANALYTICS_READ]),
}

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function hasPermission(role, permission) {
  return Boolean(rolePermissions[role]?.has(permission))
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!env.auth.required && !req.auth?.role) {
      next()
      return
    }

    if (hasPermission(req.auth?.role, permission)) {
      next()
      return
    }

    writeAuditLog({
      req,
      action: 'permission.denied',
      entityType: 'permission',
      entityId: permission,
      statusCode: 403,
      metadata: {
        role: req.auth?.role || null,
        permission,
      },
    }).catch((error) => {
      console.warn('Failed to write permission denial audit log:', error.message)
    })

    next(createHttpError('You do not have permission to perform this action.', 403))
  }
}
