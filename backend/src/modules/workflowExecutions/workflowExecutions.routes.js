import { Router } from 'express'

import {
  cancelWorkflowExecutionController,
  getWorkflowExecutionController,
  resumeDueWorkflowExecutionsController,
  resumeWorkflowExecutionController,
  retryWorkflowExecutionController,
} from './workflowExecutions.controller.js'
import { auditAction } from '../../middleware/audit.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const workflowExecutionsRouter = Router()

const workflowResumeBodySchema = {
  context: { type: 'object' },
}

workflowExecutionsRouter.post(
  '/resume-due',
  validateBody({ now: { type: 'string' } }),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_execution.resume_due', 'workflow_execution'),
  resumeDueWorkflowExecutionsController,
)

workflowExecutionsRouter.post(
  '/:id/cancel',
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_execution.cancel', 'workflow_execution', (req) => req.params.id),
  cancelWorkflowExecutionController,
)

workflowExecutionsRouter.post(
  '/:id/retry',
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_execution.retry', 'workflow_execution', (req) => req.params.id),
  retryWorkflowExecutionController,
)

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
