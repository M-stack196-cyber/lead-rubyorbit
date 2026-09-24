import { Router } from 'express'

import {
  checkCampaignNoRepliesController,
  checkSentEmailNoReplyController,
  getNoReplyMonitoringStatusController,
  getSentEmailNoReplyStatusController,
  listCampaignNoRepliesController,
} from './noReplyMonitoring.controller.js'
import { listCampaignFollowupCandidatesController } from '../followupDrafts/followupDrafts.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const noReplyMonitoringRouter = Router()

noReplyMonitoringRouter.get('/status', getNoReplyMonitoringStatusController)
noReplyMonitoringRouter.post(
  '/check-sent-email/:sentEmailId',
  validateBody({
    timeoutDays: { type: 'number', min: 1, max: 30 },
  }),
  requirePermission(permissions.NO_REPLY_CHECK),
  checkSentEmailNoReplyController,
)
noReplyMonitoringRouter.post(
  '/check-campaign/:campaignId',
  validateBody({
    timeoutDays: { type: 'number', min: 1, max: 30 },
  }),
  requirePermission(permissions.NO_REPLY_CHECK),
  checkCampaignNoRepliesController,
)
noReplyMonitoringRouter.get('/campaigns/:campaignId/no-replies', listCampaignNoRepliesController)
noReplyMonitoringRouter.get(
  '/campaigns/:campaignId/followup-candidates',
  listCampaignFollowupCandidatesController,
)
noReplyMonitoringRouter.get(
  '/sent-emails/:sentEmailId/no-reply-status',
  getSentEmailNoReplyStatusController,
)
