import {
  clearStoredAuthSession,
  getCurrentUser,
  getStoredAuthSession,
  storeAuthSession,
} from './api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const authRequired = import.meta.env.VITE_AUTH_REQUIRED === 'true'

export function isAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

function getSupabaseAuthUrl(path) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`
}

async function parseSupabaseAuthResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || payload.error || 'Authentication failed.')
  }

  return payload
}

function mapSupabaseSession(payload) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at || null,
    user: payload.user
      ? {
          id: payload.user.id,
          email: payload.user.email,
        }
      : null,
  }
}

export async function signInWithPassword({ email, password }) {
  if (!isAuthConfigured()) {
    throw new Error('Supabase auth is not configured for the frontend.')
  }

  const response = await fetch(getSupabaseAuthUrl('/token?grant_type=password'), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const payload = await parseSupabaseAuthResponse(response)
  const session = storeAuthSession(mapSupabaseSession(payload))
  const profile = await getCurrentUser()

  return {
    session,
    profile,
  }
}

export async function restoreAuthSession() {
  const session = getStoredAuthSession()

  if (!session?.accessToken) {
    return {
      session: null,
      profile: null,
    }
  }

  storeAuthSession(session)

  try {
    const profile = await getCurrentUser()

    return {
      session,
      profile,
    }
  } catch (error) {
    clearStoredAuthSession()
    throw error
  }
}

export async function signOut(session) {
  if (isAuthConfigured() && session?.accessToken) {
    await fetch(getSupabaseAuthUrl('/logout'), {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
    }).catch(() => null)
  }

  clearStoredAuthSession()
}
