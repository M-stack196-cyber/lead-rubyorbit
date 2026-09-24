import crypto from 'crypto'

import { env } from '../config/env.js'

const encryptedPrefix = 'enc:v1'

function getEncryptionKey() {
  const rawKey = env.security.tokenEncryptionKey

  if (!rawKey) {
    return null
  }

  const base64Key = Buffer.from(rawKey, 'base64')
  if (base64Key.length === 32) return base64Key

  if (/^[a-f0-9]{64}$/i.test(rawKey)) {
    return Buffer.from(rawKey, 'hex')
  }

  const utf8Key = Buffer.from(rawKey, 'utf8')
  if (utf8Key.length === 32) return utf8Key

  const error = new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes as base64, hex, or UTF-8.')
  error.statusCode = 500
  throw error
}

export function isEncryptedSecret(value) {
  return String(value || '').startsWith(`${encryptedPrefix}:`)
}

export function encryptSecret(value) {
  if (!value) {
    return null
  }

  const key = getEncryptionKey()

  if (!key) {
    const error = new Error('TOKEN_ENCRYPTION_KEY is required before storing OAuth tokens.')
    error.statusCode = 500
    throw error
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    encryptedPrefix,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptSecret(value) {
  if (!value) {
    return null
  }

  if (!isEncryptedSecret(value)) {
    return value
  }

  const key = getEncryptionKey()

  if (!key) {
    const error = new Error('TOKEN_ENCRYPTION_KEY is required to read encrypted OAuth tokens.')
    error.statusCode = 500
    throw error
  }

  const [, version, ivBase64, tagBase64, encryptedBase64] = String(value).split(':')

  if (version !== 'v1' || !ivBase64 || !tagBase64 || !encryptedBase64) {
    const error = new Error('Encrypted secret value is malformed.')
    error.statusCode = 500
    throw error
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
