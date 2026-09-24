import nodemailer from 'nodemailer'

import { decryptSecret } from '../../utils/secretCrypto.js'

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function bodyToHtml(body = '') {
  const value = String(body || '')
  return value.includes('<') ? value : value.replace(/\n/g, '<br>')
}

function bodyToText(body = '') {
  return String(body || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getRecipientEmail(draft) {
  return draft?.leads?.email || draft?.lead?.email
}

export async function sendSmtpMessage({ account, draft }) {
  if (!account.smtp_host || !account.smtp_port || !account.smtp_secret_encrypted) {
    throw createHttpError('SMTP account is missing host, port, or password.', 400)
  }

  const smtpSecret = decryptSecret(account.smtp_secret_encrypted)

  if (!smtpSecret) {
    throw createHttpError('SMTP account password is missing.', 400)
  }

  const to = getRecipientEmail(draft)

  if (!to) {
    throw createHttpError('Recipient email is required before SMTP sending.', 400)
  }

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: Number(account.smtp_port),
    secure: Boolean(account.smtp_secure),
    auth: account.smtp_username
      ? {
          user: account.smtp_username,
          pass: smtpSecret,
        }
      : undefined,
  })

  const result = await transporter.sendMail({
    from: account.from_name
      ? `"${account.from_name}" <${account.email_address}>`
      : account.email_address,
    to,
    subject: draft.subject,
    text: bodyToText(draft.body),
    html: bodyToHtml(draft.body),
  })

  return {
    messageId: result.messageId || `smtp_msg_${Date.now()}`,
    threadId:
      result.messageId ||
      `smtp_thread_${draft.campaign_lead_id || draft.campaignLeadId || draft.lead_id || draft.leadId}`,
    sentAt: new Date().toISOString(),
  }
}
