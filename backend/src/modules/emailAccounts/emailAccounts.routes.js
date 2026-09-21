import { Router } from 'express'

import {
  archiveEmailAccountController,
  createEmailAccountController,
  disableEmailAccountController,
  enableEmailAccountController,
  getEmailAccountByIdController,
  listEmailAccountsController,
  updateEmailAccountController,
} from './emailAccounts.controller.js'

export const emailAccountsRouter = Router()

emailAccountsRouter.get('/', listEmailAccountsController)
emailAccountsRouter.post('/', createEmailAccountController)
emailAccountsRouter.get('/:id', getEmailAccountByIdController)
emailAccountsRouter.patch('/:id', updateEmailAccountController)
emailAccountsRouter.post('/:id/enable', enableEmailAccountController)
emailAccountsRouter.post('/:id/disable', disableEmailAccountController)
emailAccountsRouter.post('/:id/archive', archiveEmailAccountController)
