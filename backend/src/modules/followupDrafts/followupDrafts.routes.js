import { Router } from 'express'

import {
  createFollowupDraftController,
  createFollowupDraftFromNoReplyController,
  generateAiFollowupDraftFromNoReplyController,
  getFollowupDraftByIdController,
  listFollowupDraftsController,
} from './followupDrafts.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const followupDraftsRouter = Router()

const followupDraftBodySchema = {
  campaignId: { type: 'string' },
  leadId: { type: 'string' },
  campaignLeadId: { type: 'string' },
  sourceNoReplySentEmailId: { type: 'string' },
  sourceTeamDecisionId: { type: 'string' },
  subject: { type: 'string', maxLength: 500 },
  body: { type: 'string', maxLength: 50000 },
}

followupDraftsRouter.get('/', listFollowupDraftsController)
followupDraftsRouter.post(
  '/',
  validateBody({
    ...followupDraftBodySchema,
    campaignId: { ...followupDraftBodySchema.campaignId, required: true },
    leadId: { ...followupDraftBodySchema.leadId, required: true },
    campaignLeadId: { ...followupDraftBodySchema.campaignLeadId, required: true },
    sourceNoReplySentEmailId: {
      ...followupDraftBodySchema.sourceNoReplySentEmailId,
      required: true,
    },
  }),
  requirePermission(permissions.FOLLOWUP_WRITE),
  createFollowupDraftController,
)
followupDraftsRouter.post(
  '/create-from-no-reply/:sentEmailId',
  validateBody({
    sourceTeamDecisionId: { type: 'string' },
    subject: { type: 'string', maxLength: 500 },
    body: { type: 'string', maxLength: 50000 },
  }),
  requirePermission(permissions.FOLLOWUP_WRITE),
  createFollowupDraftFromNoReplyController,
)
followupDraftsRouter.post(
  '/generate-ai-from-no-reply/:sentEmailId',
  validateBody({
    sourceTeamDecisionId: { type: 'string' },
    tone: { type: 'string', maxLength: 80 },
    callToAction: { type: 'string', maxLength: 500 },
    subject: { type: 'string', maxLength: 500 },
  }),
  requirePermission(permissions.FOLLOWUP_WRITE),
  generateAiFollowupDraftFromNoReplyController,
)
followupDraftsRouter.get('/:id', getFollowupDraftByIdController)
