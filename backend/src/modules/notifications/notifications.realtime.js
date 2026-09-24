import { WebSocket, WebSocketServer } from 'ws'

import {
  createSupabaseAnonClient,
  createSupabaseServiceClient,
} from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { defaultWorkspaceId } from '../../middleware/workspace.js'

let wss = null

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

async function getTeamMemberForUser(user) {
  const supabase = createSupabaseServiceClient()

  if (!supabase || !user?.email) return null

  const { data, error } = await supabase
    .from('team_members')
    .select('id, email, status')
    .eq('email', user.email)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function resolveRealtimeWorkspace(url) {
  if (!env.auth.required) {
    return defaultWorkspaceId
  }

  const token = url.searchParams.get('token') || ''
  const requestedWorkspaceId = url.searchParams.get('workspaceId') || ''

  if (!token) {
    throw new Error('Authentication token is required.')
  }

  const anon = createSupabaseAnonClient()
  const service = createSupabaseServiceClient()

  if (!anon || !service) {
    throw new Error('Supabase clients are not configured.')
  }

  const { data: userData, error: userError } = await anon.auth.getUser(token)

  if (userError || !userData?.user) {
    throw new Error('Invalid or expired authentication token.')
  }

  const teamMember = await getTeamMemberForUser(userData.user)

  if (!teamMember || teamMember.status !== 'active') {
    throw new Error('Active team membership is required.')
  }

  let membershipQuery = service
    .from('workspace_memberships')
    .select('workspace_id, status, workspaces (id, status)')
    .eq('team_member_id', teamMember.id)
    .eq('status', 'active')

  if (requestedWorkspaceId) {
    membershipQuery = membershipQuery.eq('workspace_id', requestedWorkspaceId)
  }

  const { data: membership, error: membershipError } = await membershipQuery
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  if (!membership || membership.workspaces?.status !== 'active') {
    throw new Error('Workspace access is required.')
  }

  return membership.workspace_id
}

export function setupNotificationRealtime(server) {
  if (wss) return wss

  wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)

    if (url.pathname !== '/api/notifications/realtime') {
      return
    }

    try {
      const workspaceId = await resolveRealtimeWorkspace(url)

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.workspaceId = workspaceId
        wss.emit('connection', ws, request)
      })
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    }
  })

  wss.on('connection', (socket) => {
    sendJson(socket, {
      type: 'connected',
      data: {
        workspaceId: socket.workspaceId,
      },
    })
  })

  return wss
}

export function broadcastNotification(notification) {
  if (!wss || !notification?.workspaceId) return

  for (const client of wss.clients) {
    if (client.workspaceId === notification.workspaceId) {
      sendJson(client, {
        type: 'notification.created',
        data: notification,
      })
    }
  }
}
