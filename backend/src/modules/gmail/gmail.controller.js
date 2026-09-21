import { env } from '../../config/env.js'
import {
  createGmailConnectUrl,
  disconnectGmailAccount,
  getGmailStatus,
  handleGmailOAuthCallback,
} from './gmail.service.js'

function buildFrontendRedirect(status) {
  const url = new URL('/email-accounts', env.clientUrl)
  url.searchParams.set('gmail', status)

  return url.toString()
}

export async function getGmailStatusController(_req, res, next) {
  try {
    res.json({
      message: 'Gmail OAuth status fetched successfully.',
      data: getGmailStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function createGmailConnectUrlController(req, res, next) {
  try {
    const result = await createGmailConnectUrl(req.params.emailAccountId)

    res.json({
      message: 'Gmail OAuth URL created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function handleGmailOAuthCallbackController(req, res) {
  try {
    await handleGmailOAuthCallback({
      code: req.query.code,
      state: req.query.state,
    })

    res.redirect(buildFrontendRedirect('connected'))
  } catch {
    res.redirect(buildFrontendRedirect('error'))
  }
}

export async function disconnectGmailAccountController(req, res, next) {
  try {
    const result = await disconnectGmailAccount(req.params.emailAccountId)

    res.json({
      message: 'Gmail account disconnected successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
