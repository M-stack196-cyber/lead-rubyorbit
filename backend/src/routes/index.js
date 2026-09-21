import { Router } from 'express'

import { healthRouter } from './healthRoutes.js'
import { campaignsRouter } from '../modules/campaigns/campaigns.routes.js'
import { leadUploadsRouter } from '../modules/leadUploads/leadUploads.routes.js'
import { leadsRouter } from '../modules/leads/leads.routes.js'

export const apiRoutes = Router()

apiRoutes.use('/health', healthRouter)
apiRoutes.use('/lead-uploads', leadUploadsRouter)
apiRoutes.use('/campaigns', campaignsRouter)
apiRoutes.use('/leads', leadsRouter)
