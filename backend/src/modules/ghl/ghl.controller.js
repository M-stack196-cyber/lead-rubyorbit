import {
  getCampaignGhlSyncStatus,
  getSettingsStatus,
  retryFailedGhlSync,
  syncCampaignToGhl,
} from './ghl.service.js'

export async function getGhlSettingsStatusController(_req, res, next) {
  try {
    res.json({
      message: 'GHL settings status fetched successfully.',
      data: getSettingsStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function syncCampaignToGhlController(req, res, next) {
  try {
    const result = await syncCampaignToGhl(req.params.campaignId)

    res.json({
      message: 'Campaign GHL sync completed.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function retryFailedGhlSyncController(req, res, next) {
  try {
    const result = await retryFailedGhlSync(req.params.campaignId)

    res.json({
      message: 'Failed GHL sync rows retried.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignGhlSyncStatusController(req, res, next) {
  try {
    const result = await getCampaignGhlSyncStatus(req.params.campaignId)

    res.json({
      message: 'Campaign GHL sync status fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
