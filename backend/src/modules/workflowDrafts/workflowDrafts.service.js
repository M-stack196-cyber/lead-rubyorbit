import { createSupabaseServiceClient } from '../../config/supabase.js'
import {
  getCurrentWorkspaceId,
  scopeWorkspace,
  withWorkspaceFields,
} from '../../middleware/workspace.js'

const workflowDraftSelect = `
  id,
  workspace_id,
  name,
  status,
  is_active,
  mode,
  nodes,
  edges,
  summary,
  validation_status,
  created_by,
  updated_by,
  created_at,
  updated_at
`

const allowedStatuses = new Set(['draft'])
const allowedModes = new Set(['visual-only'])
const allowedValidationStatuses = new Set(['Passed', 'Warning', 'Error'])

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  return supabase
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeName(name) {
  const nextName = String(name || '').trim()

  if (!nextName) {
    throw createHttpError('Workflow name is required.')
  }

  if (nextName.length > 200) {
    throw createHttpError('Workflow name must be at most 200 characters.')
  }

  return nextName
}

function normalizeArray(value, field) {
  if (!Array.isArray(value)) {
    throw createHttpError(`${field} must be an array.`)
  }

  return value
}

function normalizeObject(value, field, fallback = {}) {
  if (value === undefined) return fallback

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(`${field} must be an object.`)
  }

  return value
}

function normalizeStatus(status = 'draft') {
  if (!allowedStatuses.has(status)) {
    throw createHttpError('Workflow status must be draft.')
  }

  return status
}

function normalizeIsActive(isActive = false) {
  return Boolean(isActive)
}

function normalizeMode(mode = 'visual-only') {
  if (!allowedModes.has(mode)) {
    throw createHttpError('Workflow mode must be visual-only.')
  }

  return mode
}

function normalizeValidationStatus(validationStatus = 'Warning') {
  if (!allowedValidationStatuses.has(validationStatus)) {
    throw createHttpError('Workflow validation status must be Passed, Warning, or Error.')
  }

  return validationStatus
}

function normalizeCreatePayload(payload = {}) {
  return {
    name: normalizeName(payload.name),
    status: normalizeStatus(payload.status),
    is_active: normalizeIsActive(payload.isActive),
    mode: normalizeMode(payload.mode),
    nodes: normalizeArray(payload.nodes, 'nodes'),
    edges: normalizeArray(payload.edges, 'edges'),
    summary: normalizeObject(payload.summary, 'summary'),
    validation_status: normalizeValidationStatus(payload.validationStatus),
  }
}

function normalizeUpdatePayload(payload = {}) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    updates.name = normalizeName(payload.name)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    updates.status = normalizeStatus(payload.status)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isActive')) {
    updates.is_active = normalizeIsActive(payload.isActive)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'mode')) {
    updates.mode = normalizeMode(payload.mode)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'nodes')) {
    updates.nodes = normalizeArray(payload.nodes, 'nodes')
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'edges')) {
    updates.edges = normalizeArray(payload.edges, 'edges')
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'summary')) {
    updates.summary = normalizeObject(payload.summary, 'summary')
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'validationStatus')) {
    updates.validation_status = normalizeValidationStatus(payload.validationStatus)
  }

  if (!Object.keys(updates).length) {
    throw createHttpError('At least one workflow draft field is required.')
  }

  return updates
}

function mapWorkflowDraft(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    status: row.status,
    isActive: Boolean(row.is_active),
    mode: row.mode,
    nodes: row.nodes || [],
    edges: row.edges || [],
    summary: row.summary || {},
    validationStatus: row.validation_status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getWorkspaceId(context = {}) {
  return context.workspaceId || getCurrentWorkspaceId()
}

function getActorId(context = {}) {
  return context.actorId || null
}

function getClient(context = {}) {
  return context.supabase || getSupabaseClient()
}

function handleNotFound(error, message) {
  if (error?.code === 'PGRST116') {
    throw createHttpError(message, 404)
  }

  throw createHttpError(error.message, 500)
}

export async function listWorkflowDrafts(context = {}) {
  const supabase = getClient(context)

  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').select(workflowDraftSelect),
    getWorkspaceId(context),
  )
    .order('updated_at', { ascending: false })

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map(mapWorkflowDraft)
}

export async function getWorkflowDraftById(workflowDraftId, context = {}) {
  const supabase = getClient(context)

  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').select(workflowDraftSelect),
    getWorkspaceId(context),
  )
    .eq('id', workflowDraftId)
    .single()

  if (error) {
    handleNotFound(error, 'Workflow draft not found.')
  }

  return mapWorkflowDraft(data)
}

export async function createWorkflowDraft(payload = {}, context = {}) {
  const supabase = getClient(context)
  const workspaceId = getWorkspaceId(context)
  const actorId = getActorId(context)

  const values = withWorkspaceFields({
    ...normalizeCreatePayload(payload),
    created_by: actorId,
    updated_by: actorId,
  }, workspaceId)

  const { data, error } = await supabase
    .from('workflow_drafts')
    .insert(values)
    .select(workflowDraftSelect)
    .single()

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return mapWorkflowDraft(data)
}

export async function updateWorkflowDraft(workflowDraftId, payload = {}, context = {}) {
  const supabase = getClient(context)
  const updates = {
    ...normalizeUpdatePayload(payload),
    updated_by: getActorId(context),
  }

  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').update(updates),
    getWorkspaceId(context),
  )
    .eq('id', workflowDraftId)
    .select(workflowDraftSelect)
    .single()

  if (error) {
    handleNotFound(error, 'Workflow draft not found.')
  }

  return mapWorkflowDraft(data)
}

export async function deleteWorkflowDraft(workflowDraftId, context = {}) {
  const supabase = getClient(context)

  const { data, error } = await scopeWorkspace(
    supabase.from('workflow_drafts').delete(),
    getWorkspaceId(context),
  )
    .eq('id', workflowDraftId)
    .select(workflowDraftSelect)
    .single()

  if (error) {
    handleNotFound(error, 'Workflow draft not found.')
  }

  return mapWorkflowDraft(data)
}
