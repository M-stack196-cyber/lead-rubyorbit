import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import WebSocket from 'ws'

dotenv.config()

const roles = ['admin', 'manager', 'operator', 'viewer']
const defaultWorkspaceId = process.env.STAGING_WORKSPACE_ID || '00000000-0000-4000-8000-000000000001'

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

function getRoleConfig(role) {
  return {
    role,
    email: requiredEnv(roleEnvName(role, 'EMAIL')).trim().toLowerCase(),
    password: requiredEnv(roleEnvName(role, 'PASSWORD')),
    fullName: process.env[roleEnvName(role, 'NAME')] || `${role[0].toUpperCase()}${role.slice(1)} User`,
  }
}

function createServiceClient() {
  const url = requiredEnv('SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, serviceRoleKey, {
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

async function findAuthUserByEmail(supabase, email) {
  let page = 1
  const perPage = 100

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email)
    if (user) return user

    if (!data?.users?.length || data.users.length < perPage) return null
    page += 1
  }

  return null
}

async function getOrCreateAuthUser(supabase, userConfig) {
  const existing = await findAuthUserByEmail(supabase, userConfig.email)
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: userConfig.password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: userConfig.fullName,
      },
      app_metadata: {
        ...(existing.app_metadata || {}),
        lead_rubyorbit_role: userConfig.role,
      },
    })

    if (error) throw error
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: userConfig.email,
    password: userConfig.password,
    email_confirm: true,
    user_metadata: {
      full_name: userConfig.fullName,
    },
    app_metadata: {
      lead_rubyorbit_role: userConfig.role,
    },
  })

  if (error) throw error
  return data.user
}

async function upsertTeamMember(supabase, userConfig, authUser) {
  const { data, error } = await supabase
    .from('team_members')
    .upsert({
      full_name: userConfig.fullName,
      email: userConfig.email,
      role: userConfig.role,
      status: 'active',
      auth_user_id: authUser.id,
    }, { onConflict: 'email' })
    .select('id, email, role, status, auth_user_id')
    .single()

  if (error) throw error
  return data
}

async function upsertMembership(supabase, teamMember) {
  const { error } = await supabase
    .from('workspace_memberships')
    .upsert({
      workspace_id: defaultWorkspaceId,
      team_member_id: teamMember.id,
      role: teamMember.role,
      status: teamMember.status,
    }, { onConflict: 'workspace_id,team_member_id' })

  if (error) throw error
}

async function main() {
  const supabase = createServiceClient()
  const configs = roles.map(getRoleConfig)

  for (const config of configs) {
    const authUser = await getOrCreateAuthUser(supabase, config)
    const teamMember = await upsertTeamMember(supabase, config, authUser)
    await upsertMembership(supabase, teamMember)

    console.log(`${config.role}: linked ${teamMember.email} to auth user ${authUser.id}`)
  }

  console.log('Staging role users seeded and linked.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
