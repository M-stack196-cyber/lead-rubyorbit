import {
  createWorkflowDraft,
  deleteWorkflowDraft,
  getWorkflowDraftById,
  listWorkflowDrafts,
  updateWorkflowDraft,
} from './workflowDrafts.service.js'
import { validateWorkflowSchemaPayload } from './workflowSchemaValidator.service.js'

function getRequestContext(req) {
  return {
    actorId: req.auth?.teamMember?.id || null,
    workspaceId: req.workspace?.id,
  }
}

export async function listWorkflowDraftsController(req, res, next) {
  try {
    res.json({
      message: 'Workflow drafts fetched successfully.',
      data: await listWorkflowDrafts(getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function getWorkflowDraftByIdController(req, res, next) {
  try {
    res.json({
      message: 'Workflow draft fetched successfully.',
      data: await getWorkflowDraftById(req.params.id, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function createWorkflowDraftController(req, res, next) {
  try {
    res.status(201).json({
      message: 'Workflow draft created successfully.',
      data: await createWorkflowDraft(req.body, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateWorkflowDraftController(req, res, next) {
  try {
    res.json({
      message: 'Workflow draft updated successfully.',
      data: await updateWorkflowDraft(req.params.id, req.body, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteWorkflowDraftController(req, res, next) {
  try {
    res.json({
      message: 'Workflow draft deleted successfully.',
      data: await deleteWorkflowDraft(req.params.id, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function validateWorkflowSchemaController(req, res, next) {
  try {
    res.json({
      message: 'Workflow schema validated successfully. No automation was executed.',
      data: validateWorkflowSchemaPayload(req.body),
    })
  } catch (error) {
    next(error)
  }
}
