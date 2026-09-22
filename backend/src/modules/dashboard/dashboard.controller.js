import {
  getCampaignActivity,
  getCampaignDashboardSummary,
  getCampaignLeadTimeline,
  getDashboardSummary,
  getLeadTimeline,
} from './dashboard.service.js'

export async function getDashboardSummaryController(_req, res, next) {
  try {
    const summary = await getDashboardSummary()
    res.json({ data: summary })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignDashboardSummaryController(req, res, next) {
  try {
    const summary = await getCampaignDashboardSummary(req.params.campaignId)
    res.json({ data: summary })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignActivityController(req, res, next) {
  try {
    const activity = await getCampaignActivity(req.params.campaignId)
    res.json({ data: activity })
  } catch (error) {
    next(error)
  }
}

export async function getLeadTimelineController(req, res, next) {
  try {
    const timeline = await getLeadTimeline(req.params.leadId)
    res.json({ data: timeline })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignLeadTimelineController(req, res, next) {
  try {
    const timeline = await getCampaignLeadTimeline(req.params.campaignLeadId)
    res.json({ data: timeline })
  } catch (error) {
    next(error)
  }
}
