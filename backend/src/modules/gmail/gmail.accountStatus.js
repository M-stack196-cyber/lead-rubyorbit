export function isGmailOAuthReady(account = {}) {
  return account.provider === 'gmail' && Boolean(account.gmail_refresh_token_encrypted)
}

export function getGmailOAuthStatus(account = {}) {
  if (account.provider !== 'gmail') {
    return account.gmail_token_status || 'disconnected'
  }

  return isGmailOAuthReady(account) ? 'connected' : account.gmail_token_status || 'disconnected'
}
