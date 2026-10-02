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

function firstQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function pickErrorCode(error) {
  return error?.code || error?.statusCode || error?.status || null
}

function pickGoogleOAuthError(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.error_description ||
    error?.errors?.[0]?.reason ||
    null
  )
}

export function buildGmailOAuthCallbackLogDetails(error, query = {}) {
  return {
    message: error?.message || 'Unknown Gmail OAuth callback error.',
    code: pickErrorCode(error),
    googleOAuthResponseError: firstQueryValue(query.error) || error?.response?.data?.error || null,
    googleOAuthResponseErrorDescription:
      firstQueryValue(query.error_description) ||
      error?.response?.data?.error_description ||
      pickGoogleOAuthError(error),
    stateValidationResult:
      error?.gmailOAuthCallbackContext?.stateValidationResult ||
      (query.state ? 'not_validated' : 'missing_state'),
    emailAccountId: error?.gmailOAuthCallbackContext?.emailAccountId || null,
    redirectUri: error?.gmailOAuthCallbackContext?.redirectUri || env.google.oauthRedirectUri,
  }
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
    const result = await createGmailConnectUrl(req.params.emailAccountId, {
      workspaceId: req.workspace?.id,
      teamMemberId: req.auth?.teamMember?.id || (!env.auth.required ? 'local-demo' : null),
    })

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
  } catch (error) {
    console.warn(
      'Gmail OAuth callback failed:',
      buildGmailOAuthCallbackLogDetails(error, req.query),
    )
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
