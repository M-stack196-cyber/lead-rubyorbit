import { createSupabaseServiceClient } from '../../config/supabase.js'

const allowedProviders = new Set(['smtp', 'gmail', 'outlook', 'custom'])
const allowedStatuses = new Set(['draft', 'active', 'disabled', 'archived', 'error'])
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const listSelect = `
  id,
  provider,
  account_name,
  email_address,
  from_name,
  status,
  is_enabled,
  daily_send_limit,
  sent_today,
  last_used_at,
  gmail_email,
  gmail_connected_at,
  gmail_token_status,
  gmail_token_expires_at,
  gmail_scope,
  gmail_last_error,
  created_at,
  updated_at
`

const detailSelect = `
  ${listSelect},
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  notes
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

function validateProvider(provider) {
  if (!provider || !allowedProviders.has(provider)) {
    const error = new Error('Provider must be one of: smtp, gmail, outlook, custom.')
    error.statusCode = 400
    throw error
  }
}

function validateEmail(emailAddress) {
  if (!emailAddress || !emailRegex.test(emailAddress)) {
    const error = new Error('A valid emailAddress is required.')
    error.statusCode = 400
    throw error
  }
}

function validateDailySendLimit(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    const error = new Error('dailySendLimit must be a positive number.')
    error.statusCode = 400
    throw error
  }

  return Math.floor(numberValue)
}

function validateStatus(status) {
  if (status && !allowedStatuses.has(status)) {
    const error = new Error('Invalid email account status.')
    error.statusCode = 400
    throw error
  }
}

function mapEmailAccount(row) {
  return {
    id: row.id,
    provider: row.provider,
    accountName: row.account_name,
    emailAddress: row.email_address,
    fromName: row.from_name,
    status: row.status,
    isEnabled: row.is_enabled,
    dailySendLimit: row.daily_send_limit,
    sentToday: row.sent_today,
    lastUsedAt: row.last_used_at,
    gmailEmail: row.gmail_email,
    gmailConnectedAt: row.gmail_connected_at,
    gmailTokenStatus: row.gmail_token_status || 'disconnected',
    gmailTokenExpiresAt: row.gmail_token_expires_at,
    gmailScope: row.gmail_scope,
    gmailLastError: row.gmail_last_error,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUsername: row.smtp_username,
    smtpSecure: row.smtp_secure,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listEmailAccounts() {
  const supabase = getSupabaseClient()

  const { data, error: accountsError } = await supabase
    .from('email_accounts')
    .select(listSelect)
    .order('created_at', { ascending: false })

  if (accountsError) {
    const error = new Error(accountsError.message)
    error.statusCode = 500
    throw error
  }

  return (data || []).map(mapEmailAccount)
}

export async function createEmailAccount(payload = {}) {
  validateProvider(payload.provider)
  validateEmail(payload.emailAddress)

  const dailySendLimit = validateDailySendLimit(payload.dailySendLimit || 50)
  const status = payload.status || 'draft'
  validateStatus(status)

  const supabase = getSupabaseClient()
  const { data, error: createError } = await supabase
    .from('email_accounts')
    .insert({
      provider: payload.provider,
      email: payload.emailAddress,
      email_address: payload.emailAddress,
      display_name: payload.accountName || payload.fromName || payload.emailAddress,
      account_name: payload.accountName || payload.emailAddress,
      from_name: payload.fromName || payload.accountName || '',
      status,
      is_enabled: status === 'active',
      daily_limit: dailySendLimit,
      daily_send_limit: dailySendLimit,
      sent_today: 0,
      smtp_host: payload.smtpHost || null,
      smtp_port: payload.smtpPort ? Number(payload.smtpPort) : null,
      smtp_username: payload.smtpUsername || null,
      smtp_secure: Boolean(payload.smtpSecure),
      encrypted_secret_placeholder: payload.secretPlaceholder ? 'placeholder_configured' : null,
      notes: payload.notes || null,
      config: {},
    })
    .select(detailSelect)
    .single()

  if (createError) {
    const error = new Error(createError.message)
    error.statusCode = 500
    throw error
  }

  return mapEmailAccount(data)
}

export async function getEmailAccountById(accountId) {
  const supabase = getSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from('email_accounts')
    .select(detailSelect)
    .eq('id', accountId)
    .single()

  if (fetchError) {
    const error = new Error(
      fetchError.code === 'PGRST116' ? 'Email account not found.' : fetchError.message,
    )
    error.statusCode = fetchError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return mapEmailAccount(data)
}

export async function updateEmailAccount(accountId, payload = {}) {
  validateStatus(payload.status)

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'accountName')) {
    updates.account_name = payload.accountName || null
    updates.display_name = payload.accountName || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'fromName')) {
    updates.from_name = payload.fromName || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'dailySendLimit')) {
    updates.daily_send_limit = validateDailySendLimit(payload.dailySendLimit)
    updates.daily_limit = updates.daily_send_limit
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = payload.status
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isEnabled')) {
    updates.is_enabled = Boolean(payload.isEnabled)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'smtpHost')) {
    updates.smtp_host = payload.smtpHost || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'smtpPort')) {
    updates.smtp_port = payload.smtpPort ? Number(payload.smtpPort) : null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'smtpUsername')) {
    updates.smtp_username = payload.smtpUsername || null
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'smtpSecure')) {
    updates.smtp_secure = Boolean(payload.smtpSecure)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    updates.notes = payload.notes || null
  }

  if (!Object.keys(updates).length) {
    const error = new Error('No email account fields provided to update.')
    error.statusCode = 400
    throw error
  }

  const supabase = getSupabaseClient()
  const { data, error: updateError } = await supabase
    .from('email_accounts')
    .update(updates)
    .eq('id', accountId)
    .select(detailSelect)
    .single()

  if (updateError) {
    const error = new Error(updateError.message)
    error.statusCode = updateError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return mapEmailAccount(data)
}

export async function enableEmailAccount(accountId) {
  return updateEmailAccountState(accountId, {
    is_enabled: true,
    status: 'active',
  })
}

export async function disableEmailAccount(accountId) {
  return updateEmailAccountState(accountId, {
    is_enabled: false,
    status: 'disabled',
  })
}

export async function archiveEmailAccount(accountId) {
  return updateEmailAccountState(accountId, {
    is_enabled: false,
    status: 'archived',
  })
}

async function updateEmailAccountState(accountId, updates) {
  const supabase = getSupabaseClient()
  const { data, error: updateError } = await supabase
    .from('email_accounts')
    .update(updates)
    .eq('id', accountId)
    .select(detailSelect)
    .single()

  if (updateError) {
    const error = new Error(updateError.code === 'PGRST116' ? 'Email account not found.' : updateError.message)
    error.statusCode = updateError.code === 'PGRST116' ? 404 : 500
    throw error
  }

  return mapEmailAccount(data)
}
