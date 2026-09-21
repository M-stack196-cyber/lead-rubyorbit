import { Router } from 'express'

import {
  checkCampaignNoRepliesController,
  checkSentEmailNoReplyController,
  getNoReplyMonitoringStatusController,
  getSentEmailNoReplyStatusController,
  listCampaignNoRepliesController,
} from './noReplyMonitoring.controller.js'
import { listCampaignFollowupCandidatesController } from '../followupDrafts/followupDrafts.controller.js'

export const noReplyMonitoringRouter = Router()

noReplyMonitoringRouter.get('/status', getNoReplyMonitoringStatusController)
noReplyMonitoringRouter.post('/check-sent-email/:sentEmailId', checkSentEmailNoReplyController)
noReplyMonitoringRouter.post('/check-campaign/:campaignId', checkCampaignNoRepliesController)
noReplyMonitoringRouter.get('/campaigns/:campaignId/no-replies', listCampaignNoRepliesController)
noReplyMonitoringRouter.get(
  '/campaigns/:campaignId/followup-candidates',
  listCampaignFollowupCandidatesController,
)
noReplyMonitoringRouter.get(
  '/sent-emails/:sentEmailId/no-reply-status',
  getSentEmailNoReplyStatusController,
)
