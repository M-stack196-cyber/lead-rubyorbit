import { google } from 'googleapis'
import crypto from 'crypto'
import { env } from '../../config/env.js'

const oauthStateTtlMs = 10 * 60 * 1000

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

export function createGoogleOAuthState({
  emailAccountId,
  workspaceId,
  teamMemberId,
  ttlMs = oauthStateTtlMs,
}) {
  if (!emailAccountId || !workspaceId || !teamMemberId) {
    throw new Error('Google OAuth state requires email account, workspace, and team member.')
  }

  const state = crypto.randomBytes(32).toString('base64url')
  const record = {
    emailAccountId,
    workspaceId,
    teamMemberId,
    csrfToken: crypto.randomUUID(),
    expiresAt: Date.now() + ttlMs,
  }

  return { state, record }
}

export function hashGoogleOAuthState(state) {
  return crypto.createHash('sha256').update(state).digest('hex')
}

export function createGoogleAuthUrl(state) {
  const oauth2Client = createGoogleOAuthClient()

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
