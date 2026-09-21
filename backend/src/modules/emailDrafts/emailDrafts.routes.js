import { Router } from 'express'

import {
  approveEmailDraftController,
  createEmailDraftController,
  getEmailDraftByIdController,
  listEmailDraftsController,
  listReplyDraftsController,
  rejectEmailDraftController,
  sendReplyDraftController,
  submitEmailDraftForApprovalController,
  updateEmailDraftController,
} from './emailDrafts.controller.js'

export const emailDraftsRouter = Router()

emailDraftsRouter.get('/', listEmailDraftsController)
emailDraftsRouter.post('/', createEmailDraftController)
emailDraftsRouter.get('/reply-drafts', listReplyDraftsController)
emailDraftsRouter.get('/:id', getEmailDraftByIdController)
emailDraftsRouter.patch('/:id', updateEmailDraftController)
emailDraftsRouter.post('/:id/submit-for-approval', submitEmailDraftForApprovalController)
emailDraftsRouter.post('/:id/approve', approveEmailDraftController)
emailDraftsRouter.post('/:id/reject', rejectEmailDraftController)
emailDraftsRouter.post('/:id/send-reply', sendReplyDraftController)
