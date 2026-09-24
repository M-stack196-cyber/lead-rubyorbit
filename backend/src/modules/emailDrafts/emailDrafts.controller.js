import {
  approveEmailDraft,
  createEmailDraft,
  generateAiEmailDraft,
  generateAiReplyDraft,
  generateCampaignAiEmailDrafts,
  getEmailDraftById,
  improveEmailDraftWithAi,
  listCampaignEmailDrafts,
  listEmailDrafts,
  listReplyDrafts,
  rejectEmailDraft,
  sendReplyDraft,
  submitEmailDraftForApproval,
  updateEmailDraft,
} from './emailDrafts.service.js'

export async function listEmailDraftsController(_req, res, next) {
  try {
    const result = await listEmailDrafts()

    res.json({
      message: 'Email drafts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function generateAiReplyDraftController(req, res, next) {
  try {
    const result = await generateAiReplyDraft(req.body)

    res.status(result.alreadyExisting ? 200 : 201).json({
      message: result.alreadyExisting
        ? 'Existing AI reply draft returned successfully.'
        : 'AI reply draft generated for approval successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function createEmailDraftController(req, res, next) {
  try {
    const result = await createEmailDraft(req.body)

    res.status(201).json({
      message: 'Email draft created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function generateAiEmailDraftController(req, res, next) {
  try {
    const result = await generateAiEmailDraft(req.body)

    res.status(result.alreadyExisting ? 200 : 201).json({
      message: result.alreadyExisting
        ? 'Existing AI email draft returned successfully.'
        : 'AI email draft generated for approval successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function generateCampaignAiEmailDraftsController(req, res, next) {
  try {
    const result = await generateCampaignAiEmailDrafts(req.params.campaignId, req.body)

    res.status(201).json({
      message: 'Campaign AI email drafts generated for approval successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getEmailDraftByIdController(req, res, next) {
  try {
    const result = await getEmailDraftById(req.params.id)

    res.json({
      message: 'Email draft fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateEmailDraftController(req, res, next) {
  try {
    const result = await updateEmailDraft(req.params.id, req.body)

    res.json({
      message: 'Email draft updated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function improveEmailDraftWithAiController(req, res, next) {
  try {
    const result = await improveEmailDraftWithAi(req.params.id, req.body)

    res.json({
      message: 'Email draft improved successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function approveEmailDraftController(req, res, next) {
  try {
    const result = await approveEmailDraft(req.params.id)

    res.json({
      message: 'Email draft approved successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function submitEmailDraftForApprovalController(req, res, next) {
  try {
    const result = await submitEmailDraftForApproval(req.params.id)

    res.json({
      message: 'Email draft submitted for approval successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function rejectEmailDraftController(req, res, next) {
  try {
    const result = await rejectEmailDraft(req.params.id, req.body?.rejectedReason)

    res.json({
      message: 'Email draft rejected successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function sendReplyDraftController(req, res, next) {
  try {
    const result = await sendReplyDraft(req.params.id, req.body)

    res.status(201).json({
      message:
        result.sendMode === 'live'
          ? 'Reply draft sent through live Gmail successfully.'
          : 'Reply draft mock send completed successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignEmailDraftsController(req, res, next) {
  try {
    const result = await listCampaignEmailDrafts(req.params.campaignId)

    res.json({
      message: 'Campaign email drafts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listReplyDraftsController(_req, res, next) {
  try {
    const result = await listReplyDrafts()

    res.json({
      message: 'Reply drafts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignReplyDraftsController(req, res, next) {
  try {
    const result = await listReplyDrafts({ campaignId: req.params.campaignId })

    res.json({
      message: 'Campaign reply drafts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listReplyReplyDraftsController(req, res, next) {
  try {
    const result = await listReplyDrafts({ replyId: req.params.replyId })

    res.json({
      message: 'Reply-linked drafts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
