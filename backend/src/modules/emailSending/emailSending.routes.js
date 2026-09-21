import { Router } from 'express'

import {
  getEmailSendingStatusController,
  listCampaignSentEmailsController,
  sendCampaignEmailsController,
  sendEmailDraftController,
} from './emailSending.controller.js'

export const emailSendingRouter = Router()

emailSendingRouter.get('/status', getEmailSendingStatusController)
emailSendingRouter.post('/send-draft/:draftId', sendEmailDraftController)
emailSendingRouter.post('/send-campaign/:campaignId', sendCampaignEmailsController)
emailSendingRouter.get('/campaigns/:campaignId/sent-emails', listCampaignSentEmailsController)
