import { AsyncLocalStorage } from 'node:async_hooks'

import { env } from '../config/env.js'
import { createSupabaseServiceClient } from '../config/supabase.js'

export const defaultWorkspaceId = '00000000-0000-4000-8000-000000000001'

const workspaceStorage = new AsyncLocalStorage()

function createHttpError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getRequestedWorkspaceId(req) {
  return req.get('x-workspace-id') || req.query?.workspaceId || ''
}

export function getCurrentWorkspaceId() {
  return workspaceStorage.getStore()?.workspaceId || defaultWorkspaceId
}

export function runWithWorkspace(workspaceId, callback) {
  return workspaceStorage.run({ workspaceId: workspaceId || defaultWorkspaceId }, callback)
}

export async function resolveWorkspace(req, _res, next) {
  try {
    if (!env.auth.required) {
      req.workspace = {
        id: defaultWorkspaceId,
        role: req.auth?.role || 'admin',
      }

      runWithWorkspace(req.workspace.id, next)
      return
    }

    const teamMemberId = req.auth?.teamMember?.id

    if (!teamMemberId) {
      throw createHttpError('Authenticated user is not assigned to this workspace.', 403)
    }

    const supabase = createSupabaseServiceClient()

    if (!supabase) {
      throw createHttpError('Supabase service client is not configured.', 500)
    }

    let query = supabase
      .from('workspace_memberships')
      .select(
        `
          workspace_id,
          role,
          status,
          workspaces (
            id,
            name,
            status
          )
        `,
      )
      .eq('team_member_id', teamMemberId)
      .eq('status', 'active')

    const requestedWorkspaceId = getRequestedWorkspaceId(req)
    if (requestedWorkspaceId) {
      query = query.eq('workspace_id', requestedWorkspaceId)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      throw createHttpError(error.message, 500)
    }

    if (!data || data.workspaces?.status !== 'active') {
      throw createHttpError('Workspace access is required for this request.', 403)
    }

    req.workspace = {
      id: data.workspace_id,
      role: data.role,
      name: data.workspaces?.name || '',
    }

    req.auth.role = data.role

    runWithWorkspace(req.workspace.id, next)
  } catch (error) {
    next(error)
  }
}

export function scopeWorkspace(query, workspaceId = getCurrentWorkspaceId()) {
  return query.eq('workspace_id', workspaceId)
}

export function withWorkspaceFields(values, workspaceId = getCurrentWorkspaceId()) {
  if (Array.isArray(values)) {
    return values.map((value) => withWorkspaceFields(value, workspaceId))
  }

  return {
    ...values,
    workspace_id: values?.workspace_id || workspaceId,
  }
}
