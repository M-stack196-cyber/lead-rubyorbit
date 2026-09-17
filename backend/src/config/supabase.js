import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

function hasSupabaseConfig(key) {
  return Boolean(env.supabase.url && key)
}

export function createSupabaseAnonClient() {
  if (!hasSupabaseConfig(env.supabase.anonKey)) {
    return null
  }

  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createSupabaseServiceClient() {
  if (!hasSupabaseConfig(env.supabase.serviceRoleKey)) {
    return null
  }

  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const supabaseConfig = {
  urlConfigured: Boolean(env.supabase.url),
  anonKeyConfigured: Boolean(env.supabase.anonKey),
  serviceRoleKeyConfigured: Boolean(env.supabase.serviceRoleKey),
}
