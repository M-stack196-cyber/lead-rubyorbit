import { Router } from 'express'

import {
  checkCampaignRepliesController,
  checkSentEmailRepliesController,
  getReplyMonitoringStatusController,
  listCampaignRepliesController,
  listSentEmailRepliesController,
} from './replyMonitoring.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'

export const replyMonitoringRouter = Router()

replyMonitoringRouter.get('/status', getReplyMonitoringStatusController)
replyMonitoringRouter.post(
  '/check-sent-email/:sentEmailId',
  requirePermission(permissions.REPLY_CHECK),
  checkSentEmailRepliesController,
)
replyMonitoringRouter.post(
  '/check-campaign/:campaignId',
  requirePermission(permissions.REPLY_CHECK),
  checkCampaignRepliesController,
)
replyMonitoringRouter.get('/campaigns/:campaignId/replies', listCampaignRepliesController)
replyMonitoringRouter.get('/sent-emails/:sentEmailId/replies', listSentEmailRepliesController)
