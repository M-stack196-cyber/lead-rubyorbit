import { Router } from 'express'

import {
  createWorkflowDraftController,
  deleteWorkflowDraftController,
  getWorkflowDraftByIdController,
  listWorkflowDraftsController,
  updateWorkflowDraftController,
  validateWorkflowSchemaController,
} from './workflowDrafts.controller.js'
import { runWorkflowDraftController } from '../workflowExecutions/workflowExecutions.controller.js'
import { auditAction } from '../../middleware/audit.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const workflowDraftsRouter = Router()

const workflowDraftBodySchema = {
  name: { type: 'string', minLength: 1, maxLength: 200 },
  status: { type: 'string', enum: ['draft'] },
  mode: { type: 'string', enum: ['visual-only'] },
  nodes: { type: 'array' },
  edges: { type: 'array' },
  summary: { type: 'object' },
  validationStatus: { type: 'string', enum: ['Passed', 'Warning', 'Error'] },
}

const workflowRunBodySchema = {
  leadId: { type: 'string' },
  campaignId: { type: 'string' },
  context: { type: 'object' },
}

workflowDraftsRouter.get(
  '/',
  requirePermission(permissions.AUTOMATION_MANAGE),
  listWorkflowDraftsController,
)

workflowDraftsRouter.post(
  '/schema/validate',
  requirePermission(permissions.AUTOMATION_MANAGE),
  validateWorkflowSchemaController,
)

workflowDraftsRouter.get(
  '/:id',
  requirePermission(permissions.AUTOMATION_MANAGE),
  getWorkflowDraftByIdController,
)

workflowDraftsRouter.post(
  '/:id/run',
  validateBody(workflowRunBodySchema),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_execution.start', 'workflow_draft', (req) => req.params.id),
  runWorkflowDraftController,
)

workflowDraftsRouter.post(
  '/',
  validateBody({
    ...workflowDraftBodySchema,
    name: { ...workflowDraftBodySchema.name, required: true },
    nodes: { ...workflowDraftBodySchema.nodes, required: true },
    edges: { ...workflowDraftBodySchema.edges, required: true },
  }),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_draft.create', 'workflow_draft'),
  createWorkflowDraftController,
)

workflowDraftsRouter.put(
  '/:id',
  validateBody(workflowDraftBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_draft.update', 'workflow_draft', (req) => req.params.id),
  updateWorkflowDraftController,
)

workflowDraftsRouter.delete(
  '/:id',
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_draft.delete', 'workflow_draft', (req) => req.params.id),
  deleteWorkflowDraftController,
)
