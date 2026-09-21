import { Router } from 'express'

import {
  createGmailConnectUrlController,
  disconnectGmailAccountController,
  getGmailStatusController,
  handleGmailOAuthCallbackController,
} from './gmail.controller.js'

export const gmailRouter = Router()

gmailRouter.get('/status', getGmailStatusController)
gmailRouter.get('/connect/:emailAccountId', createGmailConnectUrlController)
gmailRouter.get('/oauth/callback', handleGmailOAuthCallbackController)
gmailRouter.post('/disconnect/:emailAccountId', disconnectGmailAccountController)
