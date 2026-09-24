import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import WebSocket from 'ws'

dotenv.config()

process.env.AUTH_REQUIRED = 'true'
process.env.EMAIL_SEND_MODE = 'mock'

const roles = ['admin', 'manager', 'operator', 'viewer']

function requiredEnv(name) {
  const value = process.env[name]
  if (!String(value || '').trim()) {
    throw new Error(`${name} is required.`)
  }
  return value
}

function roleEnvName(role, field) {
  return `STAGING_${role.toUpperCase()}_${field}`
}

function createAnonClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
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

async function signInRole(supabase, role) {
  const email = requiredEnv(roleEnvName(role, 'EMAIL')).trim().toLowerCase()
  const password = requiredEnv(roleEnvName(role, 'PASSWORD'))
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data?.session?.access_token) {
    throw new Error(`${role}: sign-in failed: ${error?.message || 'missing access token'}`)
  }

  return {
    email,
    token: data.session.access_token,
  }
}

async function requestJson(baseUrl, path, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const payload = await response.json().catch(() => ({}))

  return {
    status: response.status,
    payload,
  }
}

async function main() {
  const [{ createApp }] = await Promise.all([
    import('../src/app.js'),
  ])
  const { default: http } = await import('node:http')
  const app = createApp()
  const server = http.createServer(app)

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const supabase = createAnonClient()
  let failed = false

  try {
    for (const role of roles) {
      const signedIn = await signInRole(supabase, role)
      const me = await requestJson(baseUrl, '/api/auth/me', signedIn.token)
      const observedRole = me.payload?.data?.role

      if (me.status !== 200 || observedRole !== role) {
        failed = true
        console.log(`${role}: fail /api/auth/me status=${me.status} role=${observedRole || 'none'}`)
        continue
      }

      console.log(`${role}: pass /api/auth/me as ${signedIn.email}`)

      if (role === 'admin') {
        const teamMembers = await requestJson(baseUrl, '/api/team-members', signedIn.token)
        if (teamMembers.status !== 200) {
          failed = true
          console.log(`${role}: fail team member access status=${teamMembers.status}`)
        } else {
          console.log(`${role}: pass team member access`)
        }
      }

      if (role === 'viewer') {
        const teamMembers = await requestJson(baseUrl, '/api/team-members', signedIn.token)
        if (teamMembers.status !== 403) {
          failed = true
          console.log(`${role}: fail expected team member denial, got status=${teamMembers.status}`)
        } else {
          console.log(`${role}: pass team member denial`)
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }

  if (failed) {
    process.exitCode = 1
    return
  }

  console.log('Staging role smoke test passed.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
