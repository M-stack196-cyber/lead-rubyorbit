import { Router } from 'express'

import {
  cancelTeamDecisionController,
  completeTeamDecisionController,
  createTeamDecisionController,
  getTeamDecisionByIdController,
  listTeamDecisionsController,
  updateTeamDecisionController,
} from './teamDecisions.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const teamDecisionsRouter = Router()

const decisionTypeValues = [
  'stop_outreach',
  'manual_handling',
  'create_reply_draft',
  'mark_qualified',
  'continue_later',
  'interested',
  'not_interested',
  'assign_to_team_member',
]
const decisionStatusValues = ['pending', 'completed', 'cancelled']
const decisionBodySchema = {
  campaignId: { type: 'string' },
  leadId: { type: 'string' },
  campaignLeadId: { type: 'string' },
  replyId: { type: 'string' },
  sentEmailId: { type: 'string' },
  decisionType: { type: 'string', enum: decisionTypeValues },
  status: { type: 'string', enum: decisionStatusValues },
  notes: { type: 'string', maxLength: 5000 },
  createdBy: { type: 'string' },
  assignedTo: { type: 'string' },
  replyDraftSubject: { type: 'string', maxLength: 500 },
  replyDraftBody: { type: 'string', maxLength: 50000 },
}

teamDecisionsRouter.get('/', listTeamDecisionsController)
teamDecisionsRouter.post(
  '/',
  validateBody({
    ...decisionBodySchema,
    campaignId: { ...decisionBodySchema.campaignId, required: true },
    leadId: { ...decisionBodySchema.leadId, required: true },
  }),
  requirePermission(permissions.TEAM_DECISION_WRITE),
  auditAction('team_decision.create', 'team_decision'),
  createTeamDecisionController,
)
teamDecisionsRouter.get('/:id', getTeamDecisionByIdController)
teamDecisionsRouter.patch(
  '/:id',
  validateBody(decisionBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.TEAM_DECISION_WRITE),
  auditAction('team_decision.update', 'team_decision', (req) => req.params.id),
  updateTeamDecisionController,
)
teamDecisionsRouter.post(
  '/:id/complete',
  validateBody(decisionBodySchema),
  requirePermission(permissions.TEAM_DECISION_WRITE),
  auditAction('team_decision.complete', 'team_decision', (req) => req.params.id),
  completeTeamDecisionController,
)
teamDecisionsRouter.post(
  '/:id/cancel',
  requirePermission(permissions.TEAM_DECISION_WRITE),
  auditAction('team_decision.cancel', 'team_decision', (req) => req.params.id),
  cancelTeamDecisionController,
)
