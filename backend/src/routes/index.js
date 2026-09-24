import { Router } from 'express'

import { healthRouter } from './healthRoutes.js'
import { analyticsRouter } from '../modules/analytics/analytics.routes.js'
import { auditLogsRouter } from '../modules/auditLogs/auditLogs.routes.js'
import { automationRouter } from '../modules/automation/automation.routes.js'
import { campaignsRouter } from '../modules/campaigns/campaigns.routes.js'
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js'
import { emailAccountsRouter } from '../modules/emailAccounts/emailAccounts.routes.js'
import { emailDraftsRouter } from '../modules/emailDrafts/emailDrafts.routes.js'
import { emailSendingRouter } from '../modules/emailSending/emailSending.routes.js'
import { followupDraftsRouter } from '../modules/followupDrafts/followupDrafts.routes.js'
import { ghlRouter } from '../modules/ghl/ghl.routes.js'
import {
  createGmailConnectUrlController,
  disconnectGmailAccountController,
  getGmailStatusController,
  handleGmailOAuthCallbackController,
} from '../modules/gmail/gmail.controller.js'
import { leadUploadsRouter } from '../modules/leadUploads/leadUploads.routes.js'
import { leadsRouter } from '../modules/leads/leads.routes.js'
import { noReplyMonitoringRouter } from '../modules/noReplyMonitoring/noReplyMonitoring.routes.js'
import { notificationsRouter } from '../modules/notifications/notifications.routes.js'
import { replyMonitoringRouter } from '../modules/replyMonitoring/replyMonitoring.routes.js'
import { teamDecisionsRouter } from '../modules/teamDecisions/teamDecisions.routes.js'
import { listReplyReplyDraftsController } from '../modules/emailDrafts/emailDrafts.controller.js'
import { listReplyTeamDecisionsController } from '../modules/teamDecisions/teamDecisions.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { permissions, requirePermission } from '../middleware/permissions.js'
import { sensitiveRateLimit } from '../middleware/rateLimit.js'
import { resolveWorkspace } from '../middleware/workspace.js'
import { auditAction } from '../middleware/audit.js'

export const apiRoutes = Router()

apiRoutes.use('/health', healthRouter)
apiRoutes.get(
  '/gmail/oauth/callback',
  sensitiveRateLimit('gmail-oauth-callback'),
  handleGmailOAuthCallbackController,
)

apiRoutes.use(requireAuth)
apiRoutes.use(resolveWorkspace)

apiRoutes.get('/auth/me', (req, res) => {
  res.json({
    message: 'Authenticated user fetched successfully.',
    data: {
      user: req.auth?.user
        ? {
            id: req.auth.user.id,
            email: req.auth.user.email,
          }
        : null,
      teamMember: req.auth?.teamMember || null,
      role: req.auth?.role || req.workspace?.role || null,
      workspace: req.workspace || null,
    },
  })
})

apiRoutes.use('/dashboard', dashboardRouter)
apiRoutes.use('/analytics', analyticsRouter)
apiRoutes.use('/audit-logs', auditLogsRouter)
apiRoutes.use('/automation', automationRouter)
apiRoutes.use('/lead-uploads', leadUploadsRouter)
apiRoutes.use('/campaigns', campaignsRouter)
apiRoutes.use('/leads', leadsRouter)
apiRoutes.use('/ghl', ghlRouter)
apiRoutes.get('/gmail/status', getGmailStatusController)
apiRoutes.get(
  '/gmail/connect/:emailAccountId',
  sensitiveRateLimit('gmail-connect'),
  requirePermission(permissions.GMAIL_MANAGE),
  auditAction('gmail.connect', 'email_account', (req) => req.params.emailAccountId),
  createGmailConnectUrlController,
)
apiRoutes.post(
  '/gmail/disconnect/:emailAccountId',
  sensitiveRateLimit('gmail-disconnect'),
  requirePermission(permissions.GMAIL_MANAGE),
  auditAction('gmail.disconnect', 'email_account', (req) => req.params.emailAccountId),
  disconnectGmailAccountController,
)
apiRoutes.use('/email-drafts', emailDraftsRouter)
apiRoutes.use('/email-accounts', emailAccountsRouter)
apiRoutes.use('/email-sending', emailSendingRouter)
apiRoutes.use('/followup-drafts', followupDraftsRouter)
apiRoutes.use('/reply-monitoring', replyMonitoringRouter)
apiRoutes.use('/no-reply-monitoring', noReplyMonitoringRouter)
apiRoutes.use('/notifications', notificationsRouter)
apiRoutes.use('/team-decisions', teamDecisionsRouter)
apiRoutes.get('/replies/:replyId/reply-drafts', listReplyReplyDraftsController)
apiRoutes.get('/replies/:replyId/team-decisions', listReplyTeamDecisionsController)
