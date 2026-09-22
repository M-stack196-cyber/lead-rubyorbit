import { Router } from 'express'

import {
  getCampaignActivityController,
  getCampaignDashboardSummaryController,
  getCampaignLeadTimelineController,
  getDashboardSummaryController,
  getLeadTimelineController,
} from './dashboard.controller.js'

export const dashboardRouter = Router()

dashboardRouter.get('/summary', getDashboardSummaryController)
dashboardRouter.get('/campaigns/:campaignId/summary', getCampaignDashboardSummaryController)
dashboardRouter.get('/campaigns/:campaignId/activity', getCampaignActivityController)
dashboardRouter.get('/leads/:leadId/timeline', getLeadTimelineController)
dashboardRouter.get('/campaign-leads/:campaignLeadId/timeline', getCampaignLeadTimelineController)
