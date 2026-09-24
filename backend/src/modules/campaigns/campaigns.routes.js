import { Router } from 'express'

import {
  addLeadsToCampaignController,
  createCampaignController,
  getCampaignByIdController,
  listCampaignLeadsController,
  listCampaignsController,
  updateCampaignLeadOutreachStatusController,
  updateCampaignController,
} from './campaigns.controller.js'
import {
  listCampaignEmailDraftsController,
  listCampaignReplyDraftsController,
} from '../emailDrafts/emailDrafts.controller.js'
import { listCampaignFollowupDraftsController } from '../followupDrafts/followupDrafts.controller.js'
import { listCampaignNotificationsController } from '../notifications/notifications.controller.js'
import { listCampaignTeamDecisionsController } from '../teamDecisions/teamDecisions.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const campaignsRouter = Router()

const campaignStatusValues = ['draft', 'active', 'paused', 'completed', 'archived']
const campaignBodySchema = {
  name: { type: 'string', minLength: 1, maxLength: 200 },
  description: { type: 'string', maxLength: 2000 },
  status: { type: 'string', enum: campaignStatusValues },
}

campaignsRouter.get('/', listCampaignsController)
campaignsRouter.post(
  '/',
  validateBody({
    ...campaignBodySchema,
    name: { ...campaignBodySchema.name, required: true },
  }),
  requirePermission(permissions.CAMPAIGN_WRITE),
  auditAction('campaign.create', 'campaign'),
  createCampaignController,
)
campaignsRouter.get('/:id', getCampaignByIdController)
campaignsRouter.patch(
  '/:id',
  validateBody(campaignBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.CAMPAIGN_WRITE),
  auditAction('campaign.update', 'campaign', (req) => req.params.id),
  updateCampaignController,
)
campaignsRouter.post(
  '/:id/leads',
  validateBody({
    leadIds: { type: 'array', required: true, minItems: 1, itemType: 'string' },
  }),
  requirePermission(permissions.CAMPAIGN_WRITE),
  auditAction('campaign.leads.add', 'campaign', (req) => req.params.id),
  addLeadsToCampaignController,
)
campaignsRouter.get('/:id/leads', listCampaignLeadsController)
campaignsRouter.patch(
  '/:campaignId/leads/:campaignLeadId/status',
  validateBody({
    outreachStatus: { type: 'string', enum: ['pending', 'paused', 'stopped'], required: true },
  }),
  requirePermission(permissions.CAMPAIGN_WRITE),
  auditAction('campaign.lead_status.update', 'campaign_lead', (req) => req.params.campaignLeadId),
  updateCampaignLeadOutreachStatusController,
)
campaignsRouter.get('/:campaignId/email-drafts', listCampaignEmailDraftsController)
campaignsRouter.get('/:campaignId/reply-drafts', listCampaignReplyDraftsController)
campaignsRouter.get('/:campaignId/followup-drafts', listCampaignFollowupDraftsController)
campaignsRouter.get('/:campaignId/team-decisions', listCampaignTeamDecisionsController)
campaignsRouter.get('/:campaignId/notifications', listCampaignNotificationsController)
