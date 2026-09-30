import { Router } from 'express'

import { getWorkflowExecutionController } from './workflowExecutions.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'

export const workflowExecutionsRouter = Router()

workflowExecutionsRouter.get(
  '/:id',
  requirePermission(permissions.AUTOMATION_MANAGE),
  getWorkflowExecutionController,
)
