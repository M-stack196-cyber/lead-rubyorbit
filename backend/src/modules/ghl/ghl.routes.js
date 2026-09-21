import { Router } from 'express'

import {
  getCampaignGhlSyncStatusController,
  getGhlSettingsStatusController,
  retryFailedGhlSyncController,
  syncCampaignToGhlController,
} from './ghl.controller.js'

export const ghlRouter = Router()

ghlRouter.get('/settings/status', getGhlSettingsStatusController)
ghlRouter.post('/campaigns/:campaignId/sync', syncCampaignToGhlController)
ghlRouter.post('/campaigns/:campaignId/retry-failed', retryFailedGhlSyncController)
ghlRouter.get('/campaigns/:campaignId/sync-status', getCampaignGhlSyncStatusController)
