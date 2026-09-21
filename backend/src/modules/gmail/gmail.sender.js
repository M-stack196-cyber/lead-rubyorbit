import { google } from 'googleapis'

import { createGoogleOAuthClient } from './gmail.oauthClient.js'

function encodeHeader(value = '') {
  const stringValue = String(value).replace(/[\r\n]+/g, ' ')

  if (/^[\x00-\x7F]*$/.test(stringValue)) {
    return stringValue
  }

  return `=?UTF-8?B?${Buffer.from(stringValue).toString('base64')}?=`
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function buildMimeEmail({ body, fromEmail, fromName, subject, toEmail }) {
  const from = fromName ? `${encodeHeader(fromName)} <${fromEmail}>` : fromEmail
  const headers = [
    `To: ${toEmail}`,
    `From: ${from}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
  ]

  return `${headers.join('\r\n')}\r\n\r\n${body || ''}`
}

export async function sendGmailMessage({ account, draft }) {
  if (!account.gmail_refresh_token_encrypted) {
    const error = new Error('Gmail account is missing a refresh token. Reconnect Gmail OAuth.')
    error.statusCode = 400
    throw error
  }

  const oauth2Client = createGoogleOAuthClient()

  oauth2Client.setCredentials({
    access_token: account.gmail_access_token_encrypted || undefined,
    refresh_token: account.gmail_refresh_token_encrypted,
    expiry_date: account.gmail_token_expires_at
      ? new Date(account.gmail_token_expires_at).getTime()
      : undefined,
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const raw = base64UrlEncode(
    buildMimeEmail({
      toEmail: draft.leads.email,
      fromEmail: account.gmail_email || account.email_address,
      fromName: account.from_name,
      subject: draft.subject,
      body: draft.body,
    }),
  )

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })

  return {
    messageId: data.id,
    threadId: data.threadId,
    sentAt: new Date().toISOString(),
  }
}
