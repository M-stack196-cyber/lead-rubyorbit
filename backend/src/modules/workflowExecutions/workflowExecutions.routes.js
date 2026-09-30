import { Router } from 'express'

import {
  getWorkflowExecutionController,
  resumeWorkflowExecutionController,
} from './workflowExecutions.controller.js'
import { auditAction } from '../../middleware/audit.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const workflowExecutionsRouter = Router()

const workflowResumeBodySchema = {
  context: { type: 'object' },
}

workflowExecutionsRouter.post(
  '/:id/resume',
  validateBody(workflowResumeBodySchema),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_execution.resume', 'workflow_execution', (req) => req.params.id),
  resumeWorkflowExecutionController,
)

workflowExecutionsRouter.get(
  '/:id',
  requirePermission(permissions.AUTOMATION_MANAGE),
  getWorkflowExecutionController,
)
