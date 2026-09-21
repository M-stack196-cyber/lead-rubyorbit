import { Router } from 'express'

import {
  cancelTeamDecisionController,
  completeTeamDecisionController,
  createTeamDecisionController,
  getTeamDecisionByIdController,
  listTeamDecisionsController,
  updateTeamDecisionController,
} from './teamDecisions.controller.js'

export const teamDecisionsRouter = Router()

teamDecisionsRouter.get('/', listTeamDecisionsController)
teamDecisionsRouter.post('/', createTeamDecisionController)
teamDecisionsRouter.get('/:id', getTeamDecisionByIdController)
teamDecisionsRouter.patch('/:id', updateTeamDecisionController)
teamDecisionsRouter.post('/:id/complete', completeTeamDecisionController)
teamDecisionsRouter.post('/:id/cancel', cancelTeamDecisionController)
