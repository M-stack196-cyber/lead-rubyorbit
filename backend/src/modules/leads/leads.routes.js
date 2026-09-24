import { Router } from 'express'

import {
  getLeadDuplicateSummaryController,
  listImportedLeadsController,
  updateLeadMetadataController,
} from './leads.controller.js'
import { auditAction } from '../../middleware/audit.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const leadsRouter = Router()

leadsRouter.get('/', listImportedLeadsController)
leadsRouter.get('/duplicates', getLeadDuplicateSummaryController)
leadsRouter.patch(
  '/:id/metadata',
  validateBody({
    tags: { type: 'array', itemType: 'string' },
    score: { type: 'number', min: 0, max: 100 },
  }, { requireAtLeastOne: true }),
  requirePermission(permissions.CAMPAIGN_WRITE),
  auditAction('lead.metadata.update', 'lead', (req) => req.params.id),
  updateLeadMetadataController,
)
