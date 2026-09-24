import { Router } from 'express'

import {
  getWorkflowSettingsController,
  updateWorkflowSettingsController,
} from './workflowSettings.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const workflowSettingsRouter = Router()

const unitValues = ['seconds', 'minutes', 'hours', 'days']

workflowSettingsRouter.get(
  '/',
  requirePermission(permissions.AUTOMATION_MANAGE),
  getWorkflowSettingsController,
)

workflowSettingsRouter.patch(
  '/',
  validateBody({
    replyCheckIntervalValue: { type: 'number', min: 1, max: 1440 },
    replyCheckIntervalUnit: { type: 'string', enum: unitValues },
    replyWaitingTimeValue: { type: 'number', min: 1, max: 30 },
    replyWaitingTimeUnit: { type: 'string', enum: unitValues },
    noReplyTimeoutDays: { type: 'number', min: 1, max: 30 },
    automationCampaignBatchSize: { type: 'number', min: 1, max: 100 },
    createFollowupDrafts: { type: 'boolean' },
    followupDraftBatchSize: { type: 'number', min: 1, max: 100 },
  }, { requireAtLeastOne: true }),
  requirePermission(permissions.AUTOMATION_MANAGE),
  auditAction('workflow_settings.update', 'workflow_settings'),
  updateWorkflowSettingsController,
)
