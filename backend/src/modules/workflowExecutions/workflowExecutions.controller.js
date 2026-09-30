import {
  cancelWorkflowExecution,
  getWorkflowExecution,
  resumeDueWorkflowExecutions,
  resumeWorkflowExecution,
  retryWorkflowExecution,
  runWorkflowExecution,
  startWorkflowExecution,
} from './workflowExecutions.service.js'

function getRequestContext(req) {
  return {
    actorId: req.auth?.teamMember?.id || null,
    workspaceId: req.workspace?.id,
  }
}

export async function runWorkflowDraftController(req, res, next) {
  try {
    const execution = await startWorkflowExecution({
      workflowDraftId: req.params.id,
      leadId: req.body?.leadId || null,
      campaignId: req.body?.campaignId || null,
      context: req.body?.context || {},
    }, getRequestContext(req))
    const completedExecution = await runWorkflowExecution(
      { executionId: execution.id },
      getRequestContext(req),
    )

    res.status(201).json({
      message: 'Workflow execution started successfully.',
      data: completedExecution,
    })
  } catch (error) {
    next(error)
  }
}

export async function getWorkflowExecutionController(req, res, next) {
  try {
    res.json({
      message: 'Workflow execution fetched successfully.',
      data: await getWorkflowExecution(req.params.id, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function resumeWorkflowExecutionController(req, res, next) {
  try {
    res.json({
      message: 'Workflow execution resumed successfully.',
      data: await resumeWorkflowExecution({
        executionId: req.params.id,
        context: req.body?.context || {},
      }, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function resumeDueWorkflowExecutionsController(req, res, next) {
  try {
    res.json({
      message: 'Due workflow executions processed successfully.',
      data: await resumeDueWorkflowExecutions(req.body || {}, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function cancelWorkflowExecutionController(req, res, next) {
  try {
    res.json({
      message: 'Workflow execution canceled successfully.',
      data: await cancelWorkflowExecution({ executionId: req.params.id }, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}

export async function retryWorkflowExecutionController(req, res, next) {
  try {
    res.json({
      message: 'Workflow execution retry started successfully.',
      data: await retryWorkflowExecution({ executionId: req.params.id }, getRequestContext(req)),
    })
  } catch (error) {
    next(error)
  }
}
