import { google } from 'googleapis'

import { createGoogleOAuthClient } from '../gmail/gmail.oauthClient.js'
import { decryptSecret, encryptSecret } from '../../utils/secretCrypto.js'
import { scopeWorkspace } from '../../middleware/workspace.js'

function normalizeHeaderName(name = '') {
  return String(name).toLowerCase()
}

function decodeBase64Url(value = '') {
  const paddedValue = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(paddedValue, 'base64').toString('utf8')
}

function findTextPlainPart(payload) {
  if (!payload) return null

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return payload
  }

  for (const part of payload.parts || []) {
    const found = findTextPlainPart(part)
    if (found) return found
  }

  return null
}

function getHeader(headers = [], headerName) {
  const normalizedName = normalizeHeaderName(headerName)
  return headers.find((header) => normalizeHeaderName(header.name) === normalizedName)?.value || ''
}

function extractEmailAddress(value = '') {
  const match = String(value).match(/<([^>]+)>/)
  return (match?.[1] || value).trim().toLowerCase()
}

function buildBodyPreview(message) {
  const snippet = String(message.snippet || '').trim()

  if (snippet) {
    return snippet.slice(0, 500)
  }

  const textPart = findTextPlainPart(message.payload)

  if (!textPart?.body?.data) {
    return ''
  }

  return decodeBase64Url(textPart.body.data)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function mapMessage(message) {
  const headers = message.payload?.headers || []
  const dateHeader = getHeader(headers, 'Date')
  const parsedDate = dateHeader ? new Date(dateHeader) : null

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    fromEmail: getHeader(headers, 'From'),
    fromEmailAddress: extractEmailAddress(getHeader(headers, 'From')),
    toEmail: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject'),
    bodyPreview: buildBodyPreview(message),
    receivedAt:
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : message.internalDate
          ? new Date(Number(message.internalDate)).toISOString()
          : null,
    rawPayload: {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      internalDate: message.internalDate || null,
      headers: {
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        date: dateHeader,
      },
    },
  }
}

export function isReplyFromOtherSender(message, account) {
  const accountEmails = new Set(
    [account.gmail_email, account.email_address].filter(Boolean).map((email) => email.toLowerCase()),
  )

  return !accountEmails.has(message.fromEmailAddress)
}

export async function readGmailThread({ account, supabase, threadId }) {
  if (!account.gmail_refresh_token_encrypted) {
    const error = new Error('Gmail account is missing a refresh token. Reconnect Gmail OAuth.')
    error.statusCode = 400
    throw error
  }

  const oauth2Client = createGoogleOAuthClient()
  const accessToken = decryptSecret(account.gmail_access_token_encrypted)
  const refreshToken = decryptSecret(account.gmail_refresh_token_encrypted)

  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken,
    expiry_date: account.gmail_token_expires_at
      ? new Date(account.gmail_token_expires_at).getTime()
      : undefined,
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const { data } = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  })

  const credentials = oauth2Client.credentials || {}

  if (credentials.access_token || credentials.expiry_date) {
    await scopeWorkspace(
      supabase.from('email_accounts').update({
        gmail_access_token_encrypted: credentials.access_token
          ? encryptSecret(credentials.access_token)
          : account.gmail_access_token_encrypted,
        gmail_token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : account.gmail_token_expires_at,
        gmail_token_status: 'connected',
        gmail_last_error: null,
      }),
    )
      .eq('id', account.id)
  }

  return {
    id: data.id,
    messages: (data.messages || []).map(mapMessage),
  }
}
