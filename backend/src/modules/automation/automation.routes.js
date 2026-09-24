import { Router } from 'express'

import {
  getAutomationStatusController,
  runAutomationNowController,
} from './automation.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const automationRouter = Router()

automationRouter.get(
  '/status',
  requirePermission(permissions.AUTOMATION_MANAGE),
  getAutomationStatusController,
)
automationRouter.post(
  '/run-now',
  validateBody({
    campaignBatchSize: { type: 'number', min: 1, max: 100 },
    noReplyTimeoutDays: { type: 'number', min: 1, max: 30 },
    createFollowupDrafts: { type: 'boolean' },
    followupDraftBatchSize: { type: 'number', min: 1, max: 100 },
  }),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('automation.run_now', 'automation'),
  runAutomationNowController,
)
