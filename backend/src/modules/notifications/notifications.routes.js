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

export const notificationsRouter = Router()

notificationsRouter.get('/', listNotificationsController)
notificationsRouter.get('/summary', getNotificationSummaryController)
notificationsRouter.post('/', createNotificationController)
notificationsRouter.post('/generate/campaign/:campaignId', generateCampaignNotificationsController)
notificationsRouter.get('/:id', getNotificationByIdController)
notificationsRouter.post('/:id/mark-read', markNotificationReadController)
notificationsRouter.post('/:id/resolve', resolveNotificationController)
notificationsRouter.post('/:id/archive', archiveNotificationController)
