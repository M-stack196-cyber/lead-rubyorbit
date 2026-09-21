import { google } from 'googleapis'

import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  createGoogleAuthUrl,
  createGoogleOAuthClient,
  decodeGoogleOAuthState,
  getGoogleOAuthScopes,
  isGoogleOAuthConfigured,
} from './gmail.oauthClient.js'

const publicAccountSelect = `
  id,
  provider,
  email_address,
  gmail_user_id,
  gmail_email,
  gmail_connected_at,
  gmail_token_status,
  gmail_token_expires_at,
  gmail_scope,
  gmail_last_error
`

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function mapGmailAccount(row) {
  return {
    id: row.id,
    provider: row.provider,
    emailAddress: row.email_address,
    gmailUserId: row.gmail_user_id,
    gmailEmail: row.gmail_email,
    gmailConnectedAt: row.gmail_connected_at,
    gmailTokenStatus: row.gmail_token_status || 'disconnected',
    gmailTokenExpiresAt: row.gmail_token_expires_at,
    gmailScope: row.gmail_scope,
    gmailLastError: row.gmail_last_error,
  }
}

async function getEmailAccountForGmail(supabase, emailAccountId) {
  const { data, error: accountError } = await supabase
    .from('email_accounts')
    .select(publicAccountSelect)
    .eq('id', emailAccountId)
    .single()

  if (accountError) {
    throw createHttpError(
      accountError.code === 'PGRST116' ? 'Email account not found.' : accountError.message,
      accountError.code === 'PGRST116' ? 404 : 500,
    )
  }

  if (data.provider !== 'gmail') {
    throw createHttpError('Only Gmail email accounts can be connected with Google OAuth.', 400)
  }

  return data
}

export function getGmailStatus() {
  return {
    configured: isGoogleOAuthConfigured(),
    redirectUri: env.google.oauthRedirectUri,
    scopes: getGoogleOAuthScopes(),
    sendMode: env.emailSend.mode || 'mock',
  }
}

export async function createGmailConnectUrl(emailAccountId) {
  if (!isGoogleOAuthConfigured()) {
    throw createHttpError('Google OAuth is not configured on the backend.', 500)
  }

  const supabase = getSupabaseClient()
  const account = await getEmailAccountForGmail(supabase, emailAccountId)
  const { authUrl } = createGoogleAuthUrl(account.id)

  return {
    emailAccountId: account.id,
    authUrl,
  }
}

export async function handleGmailOAuthCallback({ code, state }) {
  if (!code || !state) {
    throw createHttpError('Google OAuth callback requires code and state.', 400)
  }

  const decodedState = decodeGoogleOAuthState(state)

  if (!decodedState?.emailAccountId || !decodedState?.csrfToken) {
    throw createHttpError('Google OAuth state is invalid.', 400)
  }

  const supabase = getSupabaseClient()
  const account = await getEmailAccountForGmail(supabase, decodedState.emailAccountId)
  const oauth2Client = createGoogleOAuthClient()

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' })
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

    // TODO: Replace placeholder storage with production encryption/KMS before deployment.
    const updates = {
      gmail_user_id: profile.emailAddress || null,
      gmail_email: profile.emailAddress || account.email_address,
      gmail_connected_at: new Date().toISOString(),
      gmail_token_status: 'connected',
      gmail_access_token_encrypted: tokens.access_token || null,
      gmail_token_expires_at: expiresAt,
      gmail_scope: tokens.scope || getGoogleOAuthScopes().join(' '),
      gmail_last_error: null,
    }

    if (tokens.refresh_token) {
      // TODO: Replace placeholder storage with production encryption/KMS before deployment.
      updates.gmail_refresh_token_encrypted = tokens.refresh_token
    }

    const { data, error: updateError } = await supabase
      .from('email_accounts')
      .update(updates)
      .eq('id', account.id)
      .select(publicAccountSelect)
      .single()

    if (updateError) {
      throw createHttpError(updateError.message, 500)
    }

    return mapGmailAccount(data)
  } catch (error) {
    await supabase
      .from('email_accounts')
      .update({
        gmail_token_status: 'error',
        gmail_last_error: error.message,
      })
      .eq('id', account.id)

    throw error
  }
}

export async function disconnectGmailAccount(emailAccountId) {
  const supabase = getSupabaseClient()
  const account = await getEmailAccountForGmail(supabase, emailAccountId)

  const { data, error: updateError } = await supabase
    .from('email_accounts')
    .update({
      gmail_user_id: null,
      gmail_email: null,
      gmail_connected_at: null,
      gmail_token_status: 'disconnected',
      gmail_refresh_token_encrypted: null,
      gmail_access_token_encrypted: null,
      gmail_token_expires_at: null,
      gmail_scope: null,
      gmail_last_error: null,
    })
    .eq('id', account.id)
    .select(publicAccountSelect)
    .single()

  if (updateError) {
    throw createHttpError(updateError.message, 500)
  }

  return mapGmailAccount(data)
}
