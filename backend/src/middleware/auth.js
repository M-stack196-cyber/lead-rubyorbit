import {
  createSupabaseAnonClient,
  createSupabaseServiceClient,
} from '../config/supabase.js'
import { env } from '../config/env.js'

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getBearerToken(req) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return ''
  }

  return token
}

async function getTeamMemberForUser(user) {
  if (!user?.email) {
    return null
  }

  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('id, full_name, email, role, status')
    .eq('email', user.email)
    .maybeSingle()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return data
}

export async function optionalAuth(req, _res, next) {
  const token = getBearerToken(req)

  if (!token) {
    next()
    return
  }

  try {
    const supabase = createSupabaseAnonClient()

    if (!supabase) {
      throw createHttpError('Supabase anon client is not configured.', 500)
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      throw createHttpError('Invalid or expired authentication token.', 401)
    }

    const teamMember = await getTeamMemberForUser(data.user)

    req.auth = {
      user: data.user,
      teamMember,
      role: teamMember?.role || null,
    }

    next()
  } catch (error) {
    next(error)
  }
}

export async function requireAuth(req, res, next) {
  if (!env.auth.required) {
    optionalAuth(req, res, next)
    return
  }

  const token = getBearerToken(req)

  if (!token) {
    next(createHttpError('Authentication token is required.', 401))
    return
  }

  await optionalAuth(req, res, (error) => {
    if (error) {
      next(error)
      return
    }

    if (!req.auth?.user) {
      next(createHttpError('Authentication token is required.', 401))
      return
    }

    if (!req.auth.teamMember) {
      next(createHttpError('Authenticated user is not assigned to this workspace.', 403))
      return
    }

    if (req.auth.teamMember.status !== 'active') {
      next(createHttpError('Authenticated user is disabled.', 403))
      return
    }

    next()
  })
}

export function requireRole(allowedRoles = []) {
  const roles = new Set(allowedRoles)

  return (req, _res, next) => {
    if (!roles.size || roles.has(req.auth?.role)) {
      next()
      return
    }

    next(createHttpError('You do not have permission to perform this action.', 403))
  }
}
