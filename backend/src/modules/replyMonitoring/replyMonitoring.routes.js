import { Router } from 'express'

import {
  checkCampaignRepliesController,
  checkSentEmailRepliesController,
  getReplyMonitoringStatusController,
  listCampaignRepliesController,
  listSentEmailRepliesController,
} from './replyMonitoring.controller.js'

export const replyMonitoringRouter = Router()

replyMonitoringRouter.get('/status', getReplyMonitoringStatusController)
replyMonitoringRouter.post('/check-sent-email/:sentEmailId', checkSentEmailRepliesController)
replyMonitoringRouter.post('/check-campaign/:campaignId', checkCampaignRepliesController)
replyMonitoringRouter.get('/campaigns/:campaignId/replies', listCampaignRepliesController)
replyMonitoringRouter.get('/sent-emails/:sentEmailId/replies', listSentEmailRepliesController)
