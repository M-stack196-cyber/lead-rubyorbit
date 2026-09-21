import { Router } from 'express'

import { listImportedLeadsController } from './leads.controller.js'

export const leadsRouter = Router()

leadsRouter.get('/', listImportedLeadsController)
