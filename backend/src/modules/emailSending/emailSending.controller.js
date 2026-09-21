import {
  getEmailSendingStatus,
  listCampaignSentEmails,
  sendCampaignEmails,
  sendEmailDraft,
} from './emailSending.service.js'

export async function getEmailSendingStatusController(_req, res, next) {
  try {
    res.json({
      message: 'Email sending status fetched successfully.',
      data: getEmailSendingStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function sendEmailDraftController(req, res, next) {
  try {
    const result = await sendEmailDraft(req.params.draftId, req.body)

    res.status(201).json({
      message: 'Email draft sent in mock mode.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function sendCampaignEmailsController(req, res, next) {
  try {
    const result = await sendCampaignEmails(req.params.campaignId, req.body)

    res.json({
      message: 'Campaign email send completed in mock mode.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignSentEmailsController(req, res, next) {
  try {
    const result = await listCampaignSentEmails(req.params.campaignId)

    res.json({
      message: 'Campaign sent emails fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
