import { Router } from 'express'

import {
  createFollowupDraftController,
  createFollowupDraftFromNoReplyController,
  getFollowupDraftByIdController,
  listFollowupDraftsController,
} from './followupDrafts.controller.js'

export const followupDraftsRouter = Router()

followupDraftsRouter.get('/', listFollowupDraftsController)
followupDraftsRouter.post('/', createFollowupDraftController)
followupDraftsRouter.post(
  '/create-from-no-reply/:sentEmailId',
  createFollowupDraftFromNoReplyController,
)
followupDraftsRouter.get('/:id', getFollowupDraftByIdController)
