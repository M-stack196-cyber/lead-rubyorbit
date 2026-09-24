import { Router } from 'express'

import {
  archiveNotificationController,
  createNotificationController,
  generateCampaignNotificationsController,
  getNotificationByIdController,
  getNotificationSummaryController,
  listNotificationsController,
  markNotificationReadController,
  resolveNotificationController,
} from './notifications.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { sensitiveRateLimit } from '../../middleware/rateLimit.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const notificationsRouter = Router()

const notificationTypeValues = [
  'new_reply',
  'no_reply_detected',
  'team_decision_pending',
  'reply_draft_pending_approval',
  'followup_draft_created',
  'followup_required',
  'draft_approved',
  'system_info',
]
const notificationStatusValues = ['unread', 'read', 'resolved', 'archived']
const notificationPriorityValues = ['low', 'normal', 'high', 'urgent']
const notificationBodySchema = {
  type: { type: 'string', enum: notificationTypeValues },
  title: { type: 'string', minLength: 1, maxLength: 200 },
  message: { type: 'string', minLength: 1, maxLength: 2000 },
  status: { type: 'string', enum: notificationStatusValues },
  priority: { type: 'string', enum: notificationPriorityValues },
  campaignId: { type: 'string' },
  leadId: { type: 'string' },
  campaignLeadId: { type: 'string' },
  replyId: { type: 'string' },
  sentEmailId: { type: 'string' },
  emailDraftId: { type: 'string' },
  teamDecisionId: { type: 'string' },
  metadata: { type: 'object' },
}

notificationsRouter.get('/', listNotificationsController)
notificationsRouter.get('/summary', getNotificationSummaryController)
notificationsRouter.post(
  '/',
  validateBody({
    ...notificationBodySchema,
    type: { ...notificationBodySchema.type, required: true },
    title: { ...notificationBodySchema.title, required: true },
    message: { ...notificationBodySchema.message, required: true },
  }),
  requirePermission(permissions.NOTIFICATION_WRITE),
  auditAction('notification.create', 'notification'),
  createNotificationController,
)
notificationsRouter.post(
  '/generate/campaign/:campaignId',
  sensitiveRateLimit('notification-generate'),
  requirePermission(permissions.NOTIFICATION_WRITE),
  auditAction('notification.generate_campaign', 'campaign', (req) => req.params.campaignId),
  generateCampaignNotificationsController,
)
notificationsRouter.get('/:id', getNotificationByIdController)
notificationsRouter.post(
  '/:id/mark-read',
  requirePermission(permissions.NOTIFICATION_WRITE),
  auditAction('notification.mark_read', 'notification', (req) => req.params.id),
  markNotificationReadController,
)
notificationsRouter.post(
  '/:id/resolve',
  requirePermission(permissions.NOTIFICATION_WRITE),
  auditAction('notification.resolve', 'notification', (req) => req.params.id),
  resolveNotificationController,
)
notificationsRouter.post(
  '/:id/archive',
  requirePermission(permissions.NOTIFICATION_WRITE),
  auditAction('notification.archive', 'notification', (req) => req.params.id),
  archiveNotificationController,
)
