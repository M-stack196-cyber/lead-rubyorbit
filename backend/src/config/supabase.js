import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

import { env } from './env.js'

const dashboardUrlMessage =
  'SUPABASE_URL must be the project API URL like https://PROJECT_REF.supabase.co, not the Supabase dashboard URL.'

function hasSupabaseConfig(key) {
  return Boolean(env.supabase.url && key)
}

function validateSupabaseUrl() {
  const url = env.supabase.url.trim()

  if (!url) {
    return
  }

  let parsedUrl

  try {
    parsedUrl = new URL(url)
  } catch {
    const error = new Error(
      'SUPABASE_URL must be a valid URL like https://PROJECT_REF.supabase.co.',
    )
    error.statusCode = 500
    throw error
  }

  const host = parsedUrl.hostname.toLowerCase()
  const path = parsedUrl.pathname.toLowerCase()

  if (
    host === 'app.supabase.com' ||
    host === 'supabase.com' ||
    host.endsWith('.supabase.com') ||
    path.includes('/dashboard')
  ) {
    const error = new Error(dashboardUrlMessage)
    error.statusCode = 500
    throw error
  }

  if (parsedUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(host)) {
    const error = new Error(
      'SUPABASE_URL must be the project API URL like https://PROJECT_REF.supabase.co.',
    )
    error.statusCode = 500
    throw error
  }
}

const supabaseOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: WebSocket,
  },
}

export function createSupabaseAnonClient() {
  if (!hasSupabaseConfig(env.supabase.anonKey)) {
    return null
  }

  validateSupabaseUrl()

  return createClient(env.supabase.url, env.supabase.anonKey, supabaseOptions)
}

export function createSupabaseServiceClient() {
  if (!hasSupabaseConfig(env.supabase.serviceRoleKey)) {
    return null
  }

  validateSupabaseUrl()

  return createClient(env.supabase.url, env.supabase.serviceRoleKey, supabaseOptions)
}

export const supabaseConfig = {
  urlConfigured: Boolean(env.supabase.url),
  anonKeyConfigured: Boolean(env.supabase.anonKey),
  serviceRoleKeyConfigured: Boolean(env.supabase.serviceRoleKey),
}
