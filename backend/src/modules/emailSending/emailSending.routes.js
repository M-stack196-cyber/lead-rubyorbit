import { Router } from 'express'

import {
  getEmailSendingStatusController,
  listCampaignSentEmailsController,
  sendCampaignEmailsController,
  sendEmailDraftController,
} from './emailSending.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { sensitiveRateLimit } from '../../middleware/rateLimit.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const emailSendingRouter = Router()

emailSendingRouter.get('/status', getEmailSendingStatusController)
emailSendingRouter.post(
  '/send-draft/:draftId',
  validateBody({
    emailAccountId: { type: 'string', required: true },
  }),
  sensitiveRateLimit('send-draft'),
  requirePermission(permissions.EMAIL_SEND),
  auditAction('email.send_draft', 'email_draft', (req) => req.params.draftId),
  sendEmailDraftController,
)
emailSendingRouter.post(
  '/send-campaign/:campaignId',
  validateBody({
    emailAccountId: { type: 'string', required: true },
  }),
  sensitiveRateLimit('send-campaign'),
  requirePermission(permissions.EMAIL_SEND),
  auditAction('email.send_campaign', 'campaign', (req) => req.params.campaignId),
  sendCampaignEmailsController,
)
emailSendingRouter.get('/campaigns/:campaignId/sent-emails', listCampaignSentEmailsController)
