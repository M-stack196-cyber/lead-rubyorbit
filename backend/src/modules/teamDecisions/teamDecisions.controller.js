import {
  cancelTeamDecision,
  completeTeamDecision,
  createTeamDecision,
  getTeamDecisionById,
  listTeamDecisions,
  updateTeamDecision,
} from './teamDecisions.service.js'

export async function listTeamDecisionsController(req, res, next) {
  try {
    res.json({
      message: 'Team decisions fetched successfully.',
      data: await listTeamDecisions(req.query),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTeamDecisionByIdController(req, res, next) {
  try {
    res.json({
      message: 'Team decision fetched successfully.',
      data: await getTeamDecisionById(req.params.id),
    })
  } catch (error) {
    next(error)
  }
}

export async function createTeamDecisionController(req, res, next) {
  try {
    res.status(201).json({
      message: 'Team decision created successfully.',
      data: await createTeamDecision(req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTeamDecisionController(req, res, next) {
  try {
    res.json({
      message: 'Team decision updated successfully.',
      data: await updateTeamDecision(req.params.id, req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function completeTeamDecisionController(req, res, next) {
  try {
    const decision = await completeTeamDecision(req.params.id, req.body)

    res.json({
      message: decision.message || 'Team decision completed successfully.',
      data: decision,
    })
  } catch (error) {
    next(error)
  }
}

export async function cancelTeamDecisionController(req, res, next) {
  try {
    res.json({
      message: 'Team decision cancelled successfully.',
      data: await cancelTeamDecision(req.params.id),
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignTeamDecisionsController(req, res, next) {
  try {
    res.json({
      message: 'Campaign team decisions fetched successfully.',
      data: await listTeamDecisions({ campaignId: req.params.campaignId }),
    })
  } catch (error) {
    next(error)
  }
}

export async function listReplyTeamDecisionsController(req, res, next) {
  try {
    res.json({
      message: 'Reply team decisions fetched successfully.',
      data: await listTeamDecisions({ replyId: req.params.replyId }),
    })
  } catch (error) {
    next(error)
  }
}
