import {
  checkCampaignReplies,
  checkSentEmailReplies,
  getReplyMonitoringStatus,
  listCampaignReplies,
  listSentEmailReplies,
} from './replyMonitoring.service.js'

export async function getReplyMonitoringStatusController(_req, res, next) {
  try {
    res.json({
      message: 'Reply monitoring status fetched successfully.',
      data: await getReplyMonitoringStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkSentEmailRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Sent email reply check completed successfully.',
      data: await checkSentEmailReplies(req.params.sentEmailId),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkCampaignRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign reply check completed successfully.',
      data: await checkCampaignReplies(req.params.campaignId),
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign replies fetched successfully.',
      data: await listCampaignReplies(req.params.campaignId),
    })
  } catch (error) {
    next(error)
  }
}

export async function listSentEmailRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Sent email replies fetched successfully.',
      data: await listSentEmailReplies(req.params.sentEmailId),
    })
  } catch (error) {
    next(error)
  }
}
