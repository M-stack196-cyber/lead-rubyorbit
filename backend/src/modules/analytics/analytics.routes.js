import { Router } from 'express'

import {
  getAnalyticsOverviewController,
  getCampaignPerformanceController,
  getSenderPerformanceController,
} from './analytics.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'

export const analyticsRouter = Router()

analyticsRouter.get(
  '/overview',
  requirePermission(permissions.ANALYTICS_READ),
  getAnalyticsOverviewController,
)
analyticsRouter.get(
  '/campaigns',
  requirePermission(permissions.ANALYTICS_READ),
  getCampaignPerformanceController,
)
analyticsRouter.get(
  '/senders',
  requirePermission(permissions.ANALYTICS_READ),
  getSenderPerformanceController,
)
