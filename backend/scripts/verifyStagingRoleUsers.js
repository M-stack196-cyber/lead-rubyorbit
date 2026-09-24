import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import WebSocket from 'ws'

dotenv.config()

const expectedRoles = ['admin', 'manager', 'operator', 'viewer']

function requiredEnv(name) {
  const value = process.env[name]
  if (!String(value || '').trim()) {
    throw new Error(`${name} is required.`)
  }
  return value
}

function createServiceClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: WebSocket,
    },
  })
}

async function main() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workspace_memberships')
    .select(`
      role,
      status,
      workspace_id,
      team_members (
        email,
        status,
        auth_user_id
      )
    `)

  if (error) throw error

  let failed = false

  for (const role of expectedRoles) {
    const matches = (data || []).filter((row) =>
      row.role === role &&
      row.status === 'active' &&
      row.team_members?.status === 'active' &&
      row.team_members?.auth_user_id
    )
    const status = matches.length ? 'pass' : 'missing'
    if (!matches.length) failed = true
    console.log(`${role}: ${status} (${matches.length} active linked member(s))`)
  }

  if (failed) {
    process.exitCode = 1
    return
  }

  console.log('All staging role users are present and linked.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
