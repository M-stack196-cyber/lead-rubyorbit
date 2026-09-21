import { Router } from 'express'

import {
  addLeadsToCampaignController,
  createCampaignController,
  getCampaignByIdController,
  listCampaignLeadsController,
  listCampaignsController,
  updateCampaignController,
} from './campaigns.controller.js'
import {
  listCampaignEmailDraftsController,
  listCampaignReplyDraftsController,
} from '../emailDrafts/emailDrafts.controller.js'
import { listCampaignTeamDecisionsController } from '../teamDecisions/teamDecisions.controller.js'

export const campaignsRouter = Router()

campaignsRouter.get('/', listCampaignsController)
campaignsRouter.post('/', createCampaignController)
campaignsRouter.get('/:id', getCampaignByIdController)
campaignsRouter.patch('/:id', updateCampaignController)
campaignsRouter.post('/:id/leads', addLeadsToCampaignController)
campaignsRouter.get('/:id/leads', listCampaignLeadsController)
campaignsRouter.get('/:campaignId/email-drafts', listCampaignEmailDraftsController)
campaignsRouter.get('/:campaignId/reply-drafts', listCampaignReplyDraftsController)
campaignsRouter.get('/:campaignId/team-decisions', listCampaignTeamDecisionsController)
