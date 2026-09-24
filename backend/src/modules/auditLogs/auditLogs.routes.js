import { Router } from 'express'

import { permissions, requirePermission } from '../../middleware/permissions.js'
import { listAuditLogsController } from './auditLogs.controller.js'

export const auditLogsRouter = Router()

auditLogsRouter.get(
  '/',
  requirePermission(permissions.AUDIT_LOG_READ),
  listAuditLogsController,
)
