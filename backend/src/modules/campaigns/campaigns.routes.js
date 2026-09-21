import { Router } from 'express'

import {
  addLeadsToCampaignController,
  createCampaignController,
  getCampaignByIdController,
  listCampaignLeadsController,
  listCampaignsController,
  updateCampaignController,
} from './campaigns.controller.js'
import { listCampaignEmailDraftsController } from '../emailDrafts/emailDrafts.controller.js'

export const campaignsRouter = Router()

campaignsRouter.get('/', listCampaignsController)
campaignsRouter.post('/', createCampaignController)
campaignsRouter.get('/:id', getCampaignByIdController)
campaignsRouter.patch('/:id', updateCampaignController)
campaignsRouter.post('/:id/leads', addLeadsToCampaignController)
campaignsRouter.get('/:id/leads', listCampaignLeadsController)
campaignsRouter.get('/:campaignId/email-drafts', listCampaignEmailDraftsController)
