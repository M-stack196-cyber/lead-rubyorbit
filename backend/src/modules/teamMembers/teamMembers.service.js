import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  getCurrentWorkspaceId,
} from '../../middleware/workspace.js'

const allowedRoles = new Set(['admin', 'manager', 'operator', 'viewer'])
const allowedStatuses = new Set(['active', 'disabled'])

const memberSelect = `
  id,
  full_name,
  email,
  role,
  status,
  auth_user_id,
  created_at,
  updated_at
`

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function validateRole(role) {
  if (!allowedRoles.has(role)) {
    throw createHttpError('Role must be admin, manager, operator, or viewer.', 400)
  }
}

function validateStatus(status) {
  if (status && !allowedStatuses.has(status)) {
    throw createHttpError('Invalid team member status.', 400)
  }
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) {
    throw createHttpError('A valid email is required.', 400)
  }
}

function mapMember(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    authUserId: row.auth_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function upsertWorkspaceMembership(supabase, member, role) {
  const workspaceId = getCurrentWorkspaceId()

  const { error } = await supabase
    .from('workspace_memberships')
    .upsert({
      workspace_id: workspaceId,
      team_member_id: member.id,
      role,
      status: member.status === 'disabled' ? 'disabled' : 'active',
    }, { onConflict: 'workspace_id,team_member_id' })

  if (error) {
    throw createHttpError(error.message, 500)
  }
}

async function getWorkspaceMemberIds(supabase) {
  const workspaceId = getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from('workspace_memberships')
    .select('team_member_id')
    .eq('workspace_id', workspaceId)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map((row) => row.team_member_id)
}

async function assertWorkspaceMember(supabase, memberId) {
  const workspaceId = getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from('workspace_memberships')
    .select('team_member_id')
    .eq('workspace_id', workspaceId)
    .eq('team_member_id', memberId)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  if (!data) {
    throw createHttpError('Team member not found in this workspace.', 404)
  }
}

export async function listTeamMembers() {
  const supabase = getSupabaseClient()
  const memberIds = await getWorkspaceMemberIds(supabase)

  if (!memberIds.length) return []

  const { data, error } = await supabase
    .from('team_members')
    .select(memberSelect)
    .in('id', memberIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map(mapMember)
}

export async function createTeamMember(payload = {}) {
  validateEmail(payload.email)
  const role = payload.role || 'operator'
  validateRole(role)
  validateStatus(payload.status || 'active')

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      full_name: String(payload.fullName || '').trim() || null,
      email: String(payload.email).trim().toLowerCase(),
      role,
      status: payload.status || 'active',
      auth_user_id: payload.authUserId || null,
    })
    .select(memberSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, error.code === '23505' ? 409 : 500)
  }

  await upsertWorkspaceMembership(supabase, data, role)
  return mapMember(data)
}

export async function updateTeamMember(memberId, payload = {}) {
  validateStatus(payload.status)

  const updates = {}
  if (Object.prototype.hasOwnProperty.call(payload, 'fullName')) {
    updates.full_name = String(payload.fullName || '').trim() || null
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    validateEmail(payload.email)
    updates.email = String(payload.email).trim().toLowerCase()
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    validateRole(payload.role)
    updates.role = payload.role
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = payload.status
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'authUserId')) {
    updates.auth_user_id = payload.authUserId || null
  }

  if (!Object.keys(updates).length) {
    throw createHttpError('No team member fields provided to update.', 400)
  }

  const supabase = getSupabaseClient()
  await assertWorkspaceMember(supabase, memberId)

  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', memberId)
    .select(memberSelect)
    .single()

  if (error) {
    throw createHttpError(
      error.code === 'PGRST116' ? 'Team member not found.' : error.message,
      error.code === 'PGRST116' ? 404 : 500,
    )
  }

  if (updates.role || updates.status) {
    await upsertWorkspaceMembership(supabase, data, data.role)
  }

  return mapMember(data)
}

export async function deleteTeamMember(memberId) {
  return updateTeamMember(memberId, { status: 'disabled' })
}
