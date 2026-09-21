import { Router } from 'express'

import {
  approveEmailDraftController,
  createEmailDraftController,
  getEmailDraftByIdController,
  listEmailDraftsController,
  rejectEmailDraftController,
  updateEmailDraftController,
} from './emailDrafts.controller.js'

export const emailDraftsRouter = Router()

emailDraftsRouter.get('/', listEmailDraftsController)
emailDraftsRouter.post('/', createEmailDraftController)
emailDraftsRouter.get('/:id', getEmailDraftByIdController)
emailDraftsRouter.patch('/:id', updateEmailDraftController)
emailDraftsRouter.post('/:id/approve', approveEmailDraftController)
emailDraftsRouter.post('/:id/reject', rejectEmailDraftController)
