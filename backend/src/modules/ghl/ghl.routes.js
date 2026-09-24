import { Router } from 'express'

import {
  getCampaignGhlSyncStatusController,
  getGhlSettingsStatusController,
  retryFailedGhlSyncController,
  syncCampaignToGhlController,
} from './ghl.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'

export const ghlRouter = Router()

ghlRouter.get('/settings/status', getGhlSettingsStatusController)
ghlRouter.post(
  '/campaigns/:campaignId/sync',
  requirePermission(permissions.CAMPAIGN_SYNC),
  auditAction('ghl.sync_campaign', 'campaign', (req) => req.params.campaignId),
  syncCampaignToGhlController,
)
ghlRouter.post(
  '/campaigns/:campaignId/retry-failed',
  requirePermission(permissions.CAMPAIGN_SYNC),
  auditAction('ghl.retry_failed', 'campaign', (req) => req.params.campaignId),
  retryFailedGhlSyncController,
)
ghlRouter.get('/campaigns/:campaignId/sync-status', getCampaignGhlSyncStatusController)
