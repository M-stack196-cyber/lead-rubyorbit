import { Router } from 'express'
import { healthRouter } from './healthRoutes.js'

export const apiRoutes = Router()

apiRoutes.use('/health', healthRouter)
