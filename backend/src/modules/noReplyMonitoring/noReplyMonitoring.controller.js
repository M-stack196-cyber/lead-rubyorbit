import {
  checkCampaignNoReplies,
  checkSentEmailNoReply,
  getNoReplyMonitoringStatus,
  getSentEmailNoReplyStatus,
  listCampaignNoReplies,
} from './noReplyMonitoring.service.js'

export async function getNoReplyMonitoringStatusController(_req, res, next) {
  try {
    res.json({
      message: 'No-reply monitoring status fetched successfully.',
      data: await getNoReplyMonitoringStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkSentEmailNoReplyController(req, res, next) {
  try {
    res.json({
      message: 'Sent email no-reply check completed successfully.',
      data: await checkSentEmailNoReply(req.params.sentEmailId, req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkCampaignNoRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign no-reply check completed successfully.',
      data: await checkCampaignNoReplies(req.params.campaignId, req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignNoRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign no-reply leads fetched successfully.',
      data: await listCampaignNoReplies(req.params.campaignId),
    })
  } catch (error) {
    next(error)
  }
}

export async function getSentEmailNoReplyStatusController(req, res, next) {
  try {
    res.json({
      message: 'Sent email no-reply status fetched successfully.',
      data: await getSentEmailNoReplyStatus(req.params.sentEmailId),
    })
  } catch (error) {
    next(error)
  }
}
