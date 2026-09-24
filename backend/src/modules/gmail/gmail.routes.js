import { Router } from 'express'

import {
  createGmailConnectUrlController,
  disconnectGmailAccountController,
  getGmailStatusController,
  handleGmailOAuthCallbackController,
} from './gmail.controller.js'
import { requireAuth } from '../../middleware/auth.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { sensitiveRateLimit } from '../../middleware/rateLimit.js'
import { resolveWorkspace } from '../../middleware/workspace.js'
import { auditAction } from '../../middleware/audit.js'

export const gmailRouter = Router()

gmailRouter.get(
  '/oauth/callback',
  sensitiveRateLimit('gmail-oauth-callback'),
  handleGmailOAuthCallbackController,
)

gmailRouter.use(requireAuth)
gmailRouter.use(resolveWorkspace)

gmailRouter.get('/status', getGmailStatusController)
gmailRouter.get(
  '/connect/:emailAccountId',
  sensitiveRateLimit('gmail-connect'),
  requirePermission(permissions.GMAIL_MANAGE),
  auditAction('gmail.connect', 'email_account', (req) => req.params.emailAccountId),
  createGmailConnectUrlController,
)
gmailRouter.post(
  '/disconnect/:emailAccountId',
  sensitiveRateLimit('gmail-disconnect'),
  requirePermission(permissions.GMAIL_MANAGE),
  auditAction('gmail.disconnect', 'email_account', (req) => req.params.emailAccountId),
  disconnectGmailAccountController,
)
