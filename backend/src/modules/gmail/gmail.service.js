import { google } from 'googleapis'

import { env } from '../../config/env.js'
import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  createGoogleAuthUrl,
  createGoogleOAuthClient,
  createGoogleOAuthState,
  getGoogleOAuthScopes,
  hashGoogleOAuthState,
  isGoogleOAuthConfigured,
} from './gmail.oauthClient.js'
import { encryptSecret } from '../../utils/secretCrypto.js'
import { scopeWorkspace } from '../../middleware/workspace.js'

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
  gmail_last_error,
  workspace_id
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

async function getEmailAccountForGmail(
  supabase,
  emailAccountId,
  { enforceWorkspace = true, workspaceId } = {},
) {
  const baseQuery = supabase.from('email_accounts').select(publicAccountSelect)
  const query = enforceWorkspace ? scopeWorkspace(baseQuery, workspaceId) : baseQuery

  const { data, error: accountError } = await query
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

async function requireActiveWorkspaceMembership(supabase, { workspaceId, teamMemberId }) {
  if (!env.auth.required) {
    return
  }

  if (!workspaceId || !teamMemberId) {
    throw createHttpError('Google OAuth state is missing workspace ownership details.', 400)
  }

  const { data, error } = await supabase
    .from('workspace_memberships')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('team_member_id', teamMemberId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  if (!data) {
    throw createHttpError('Workspace access is required to connect Gmail.', 403)
  }
}

async function persistGoogleOAuthState(supabase, state, record) {
  const { error } = await supabase
    .from('google_oauth_states')
    .insert({
      state_hash: hashGoogleOAuthState(state),
      workspace_id: record.workspaceId,
      email_account_id: record.emailAccountId,
      team_member_id: record.teamMemberId,
      csrf_token: record.csrfToken,
      expires_at: new Date(record.expiresAt).toISOString(),
    })

  if (error) {
    throw createHttpError(error.message, 500)
  }
}

async function consumePersistedGoogleOAuthState(supabase, state) {
  const now = new Date().toISOString()
  const stateHash = hashGoogleOAuthState(state)

  const { data: existingState, error: fetchError } = await supabase
    .from('google_oauth_states')
    .select(
      `
        id,
        workspace_id,
        email_account_id,
        team_member_id,
        csrf_token,
        expires_at,
        consumed_at
      `,
    )
    .eq('state_hash', stateHash)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .maybeSingle()

  if (fetchError) {
    throw createHttpError(fetchError.message, 500)
  }

  if (!existingState) {
    throw createHttpError('Google OAuth state is invalid or expired.', 400)
  }

  const { data: consumedState, error: consumeError } = await supabase
    .from('google_oauth_states')
    .update({ consumed_at: now })
    .eq('id', existingState.id)
    .is('consumed_at', null)
    .select(
      `
        id,
        workspace_id,
        email_account_id,
        team_member_id,
        csrf_token,
        expires_at,
        consumed_at
      `,
    )
    .maybeSingle()

  if (consumeError) {
    throw createHttpError(consumeError.message, 500)
  }

  if (!consumedState) {
    throw createHttpError('Google OAuth state was already used.', 400)
  }

  return {
    emailAccountId: consumedState.email_account_id,
    workspaceId: consumedState.workspace_id,
    teamMemberId: consumedState.team_member_id,
    csrfToken: consumedState.csrf_token,
    expiresAt: consumedState.expires_at,
  }
}

export function getGmailStatus() {
  return {
    configured: isGoogleOAuthConfigured(),
    redirectUri: env.google.oauthRedirectUri,
    scopes: getGoogleOAuthScopes(),
    sendMode: env.emailSend.mode || 'mock',
  }
}

export async function createGmailConnectUrl(emailAccountId, context = {}) {
  if (!isGoogleOAuthConfigured()) {
    throw createHttpError('Google OAuth is not configured on the backend.', 500)
  }

  if (!context.workspaceId || !context.teamMemberId) {
    throw createHttpError('Workspace and authenticated user are required to connect Gmail.', 403)
  }

  const supabase = getSupabaseClient()
  const account = await getEmailAccountForGmail(supabase, emailAccountId, {
    workspaceId: context.workspaceId,
  })
  const { state, record } = createGoogleOAuthState({
    emailAccountId: account.id,
    workspaceId: context.workspaceId,
    teamMemberId: context.teamMemberId,
  })
  await persistGoogleOAuthState(supabase, state, record)
  const { authUrl } = createGoogleAuthUrl(state)

  return {
    emailAccountId: account.id,
    authUrl,
  }
}

export async function handleGmailOAuthCallback({ code, state }) {
  if (!code || !state) {
    throw createHttpError('Google OAuth callback requires code and state.', 400)
  }

  const supabase = getSupabaseClient()
  const validatedState = await consumePersistedGoogleOAuthState(supabase, state)

  if (
    !validatedState?.emailAccountId ||
    !validatedState?.workspaceId ||
    !validatedState?.teamMemberId ||
    !validatedState?.csrfToken
  ) {
    throw createHttpError('Google OAuth state is invalid or expired.', 400)
  }

  await requireActiveWorkspaceMembership(supabase, validatedState)

  const account = await getEmailAccountForGmail(supabase, validatedState.emailAccountId, {
    workspaceId: validatedState.workspaceId,
  })
  const oauth2Client = createGoogleOAuthClient()

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' })
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

    const updates = {
      gmail_user_id: profile.emailAddress || null,
      gmail_email: profile.emailAddress || account.email_address,
      gmail_connected_at: new Date().toISOString(),
      gmail_token_status: 'connected',
      gmail_access_token_encrypted: tokens.access_token ? encryptSecret(tokens.access_token) : null,
      gmail_token_expires_at: expiresAt,
      gmail_scope: tokens.scope || getGoogleOAuthScopes().join(' '),
      gmail_last_error: null,
    }

    if (tokens.refresh_token) {
      updates.gmail_refresh_token_encrypted = encryptSecret(tokens.refresh_token)
    }

    const { data, error: updateError } = await supabase
      .from('email_accounts')
      .update(updates)
      .eq('id', account.id)
      .eq('workspace_id', validatedState.workspaceId)
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
      .eq('workspace_id', validatedState.workspaceId)

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
