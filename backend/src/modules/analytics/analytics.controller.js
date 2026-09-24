import {
  getAnalyticsOverview,
  getCampaignPerformance,
  getSenderPerformance,
} from './analytics.service.js'

export async function getAnalyticsOverviewController(_req, res, next) {
  try {
    res.json({
      message: 'Analytics overview fetched successfully.',
      data: await getAnalyticsOverview(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignPerformanceController(_req, res, next) {
  try {
    res.json({
      message: 'Campaign performance fetched successfully.',
      data: await getCampaignPerformance(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getSenderPerformanceController(_req, res, next) {
  try {
    res.json({
      message: 'Sender performance fetched successfully.',
      data: await getSenderPerformance(),
    })
  } catch (error) {
    next(error)
  }
}
