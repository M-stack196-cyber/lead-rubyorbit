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
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const emailAccountsRouter = Router()

const accountStatusValues = ['draft', 'active', 'disabled', 'archived', 'error']
const accountProviderValues = ['smtp', 'gmail', 'outlook', 'custom']
const emailAccountBodySchema = {
  provider: { type: 'string', enum: accountProviderValues },
  accountName: { type: 'string', maxLength: 160 },
  emailAddress: { type: 'string', email: true, maxLength: 254 },
  fromName: { type: 'string', maxLength: 160 },
  status: { type: 'string', enum: accountStatusValues },
  isEnabled: { type: 'boolean' },
  dailySendLimit: { type: 'number', min: 1, max: 5000 },
  smtpHost: { type: 'string', maxLength: 255 },
  smtpPort: { type: 'number', min: 1, max: 65535 },
  smtpUsername: { type: 'string', maxLength: 255 },
  smtpSecure: { type: 'boolean' },
  secretPlaceholder: { type: 'string', maxLength: 500 },
  notes: { type: 'string', maxLength: 2000 },
}

emailAccountsRouter.get('/', listEmailAccountsController)
emailAccountsRouter.post(
  '/',
  validateBody({
    ...emailAccountBodySchema,
    provider: { ...emailAccountBodySchema.provider, required: true },
    emailAddress: { ...emailAccountBodySchema.emailAddress, required: true },
  }),
  requirePermission(permissions.EMAIL_ACCOUNT_MANAGE),
  createEmailAccountController,
)
emailAccountsRouter.get('/:id', getEmailAccountByIdController)
emailAccountsRouter.patch(
  '/:id',
  validateBody(emailAccountBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.EMAIL_ACCOUNT_MANAGE),
  updateEmailAccountController,
)
emailAccountsRouter.post(
  '/:id/enable',
  requirePermission(permissions.EMAIL_ACCOUNT_MANAGE),
  enableEmailAccountController,
)
emailAccountsRouter.post(
  '/:id/disable',
  requirePermission(permissions.EMAIL_ACCOUNT_MANAGE),
  disableEmailAccountController,
)
emailAccountsRouter.post(
  '/:id/archive',
  requirePermission(permissions.EMAIL_ACCOUNT_MANAGE),
  archiveEmailAccountController,
)
