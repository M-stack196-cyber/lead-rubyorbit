import { Router } from 'express'

import { healthRouter } from './healthRoutes.js'
import { campaignsRouter } from '../modules/campaigns/campaigns.routes.js'
import { emailAccountsRouter } from '../modules/emailAccounts/emailAccounts.routes.js'
import { emailDraftsRouter } from '../modules/emailDrafts/emailDrafts.routes.js'
import { emailSendingRouter } from '../modules/emailSending/emailSending.routes.js'
import { ghlRouter } from '../modules/ghl/ghl.routes.js'
import { gmailRouter } from '../modules/gmail/gmail.routes.js'
import { leadUploadsRouter } from '../modules/leadUploads/leadUploads.routes.js'
import { leadsRouter } from '../modules/leads/leads.routes.js'

export const apiRoutes = Router()

apiRoutes.use('/health', healthRouter)
apiRoutes.use('/lead-uploads', leadUploadsRouter)
apiRoutes.use('/campaigns', campaignsRouter)
apiRoutes.use('/leads', leadsRouter)
apiRoutes.use('/ghl', ghlRouter)
apiRoutes.use('/gmail', gmailRouter)
apiRoutes.use('/email-drafts', emailDraftsRouter)
apiRoutes.use('/email-accounts', emailAccountsRouter)
apiRoutes.use('/email-sending', emailSendingRouter)
