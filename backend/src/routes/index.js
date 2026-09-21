import { Router } from 'express'

import { healthRouter } from './healthRoutes.js'
import { leadUploadsRouter } from '../modules/leadUploads/leadUploads.routes.js'

export const apiRoutes = Router()

apiRoutes.use('/health', healthRouter)
apiRoutes.use('/lead-uploads', leadUploadsRouter)