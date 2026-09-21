import { google } from 'googleapis'
import crypto from 'crypto'
import { env } from '../../config/env.js'

export function isGoogleOAuthConfigured() {
  return Boolean(
    env.google.clientId &&
      env.google.clientSecret &&
      env.google.oauthRedirectUri
  )
}

export function getGoogleOAuthScopes() {
  return env.google.oauthScopes
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean)
}

export function createGoogleOAuthClient() {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth is not configured.')
  }

  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.oauthRedirectUri
  )
}

export function createGoogleAuthUrl(emailAccountId) {
  const oauth2Client = createGoogleOAuthClient()
  const csrfToken = crypto.randomUUID()

  const state = Buffer.from(
    JSON.stringify({
      emailAccountId,
      csrfToken,
    })
  ).toString('base64url')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: getGoogleOAuthScopes(),
    state,
  })

  return {
    authUrl,
    state,
  }
}

export function decodeGoogleOAuthState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}
