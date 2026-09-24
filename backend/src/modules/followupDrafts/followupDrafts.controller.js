import {
  createFollowupDraft,
  createFollowupDraftFromNoReply,
  generateAiFollowupDraftFromNoReply,
  getFollowupDraftById,
  listFollowupCandidates,
  listFollowupDrafts,
} from './followupDrafts.service.js'

export async function listFollowupDraftsController(_req, res, next) {
  try {
    res.json({
      message: 'Follow-up drafts fetched successfully.',
      data: await listFollowupDrafts(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getFollowupDraftByIdController(req, res, next) {
  try {
    res.json({
      message: 'Follow-up draft fetched successfully.',
      data: await getFollowupDraftById(req.params.id),
    })
  } catch (error) {
    next(error)
  }
}

export async function createFollowupDraftController(req, res, next) {
  try {
    const result = await createFollowupDraft(req.body)

    res.status(result.alreadyExisting ? 200 : 201).json({
      message: result.alreadyExisting
        ? 'Existing unsent follow-up draft returned.'
        : 'Follow-up draft created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function createFollowupDraftFromNoReplyController(req, res, next) {
  try {
    const result = await createFollowupDraftFromNoReply(req.params.sentEmailId, req.body)

    res.status(result.alreadyExisting ? 200 : 201).json({
      message: result.alreadyExisting
        ? 'Existing unsent follow-up draft returned.'
        : 'Follow-up draft created from no-reply sent email successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function generateAiFollowupDraftFromNoReplyController(req, res, next) {
  try {
    const result = await generateAiFollowupDraftFromNoReply(req.params.sentEmailId, req.body)

    res.status(result.alreadyExisting ? 200 : 201).json({
      message: result.alreadyExisting
        ? 'Existing unsent AI follow-up draft returned.'
        : 'AI follow-up draft generated from no-reply sent email successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignFollowupDraftsController(req, res, next) {
  try {
    res.json({
      message: 'Campaign follow-up drafts fetched successfully.',
      data: await listFollowupDrafts({ campaignId: req.params.campaignId }),
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignFollowupCandidatesController(req, res, next) {
  try {
    res.json({
      message: 'Campaign follow-up candidates fetched successfully.',
      data: await listFollowupCandidates(req.params.campaignId),
    })
  } catch (error) {
    next(error)
  }
}
