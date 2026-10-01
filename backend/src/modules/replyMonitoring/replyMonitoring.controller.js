import {
  checkCampaignReplies,
  checkSentEmailReplies,
  getReplyMonitoringStatus,
  listCampaignReplies,
  listSentEmailReplies,
  syncWorkspaceGmailReplies,
} from './replyMonitoring.service.js'

function getRequestContext(req) {
  return { workspaceId: req.workspace?.id }
}

export async function getReplyMonitoringStatusController(req, res, next) {
  try {
    res.json({
      message: 'Reply monitoring status fetched successfully.',
      data: await getReplyMonitoringStatus(getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkSentEmailRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Sent email reply check completed successfully.',
      data: await checkSentEmailReplies(req.params.sentEmailId, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function checkCampaignRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign reply check completed successfully.',
      data: await checkCampaignReplies(req.params.campaignId, getRequestContext(req)),
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


export async function syncWorkspaceGmailRepliesController(req, res, next) {
  try {
    res.json({
      message: 'Gmail replies synced successfully.',
      data: await syncWorkspaceGmailReplies(req.body || {}, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}
