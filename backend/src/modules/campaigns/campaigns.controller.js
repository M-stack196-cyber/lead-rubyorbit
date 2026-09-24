import {
  addLeadsToCampaign,
  createCampaign,
  getCampaignById,
  listCampaignLeads,
  listCampaigns,
  updateCampaign,
  updateCampaignLeadOutreachStatus,
} from './campaigns.service.js'

export async function listCampaignsController(_req, res, next) {
  try {
    const result = await listCampaigns()

    res.json({
      message: 'Campaigns fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function createCampaignController(req, res, next) {
  try {
    const result = await createCampaign(req.body)

    res.status(201).json({
      message: 'Campaign created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCampaignByIdController(req, res, next) {
  try {
    const result = await getCampaignById(req.params.id)

    res.json({
      message: 'Campaign fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCampaignController(req, res, next) {
  try {
    const result = await updateCampaign(req.params.id, req.body)

    res.json({
      message: 'Campaign updated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function addLeadsToCampaignController(req, res, next) {
  try {
    const result = await addLeadsToCampaign(req.params.id, req.body.leadIds)

    res.status(201).json({
      message: 'Leads added to campaign successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignLeadsController(req, res, next) {
  try {
    const result = await listCampaignLeads(req.params.id)

    res.json({
      message: 'Campaign leads fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCampaignLeadOutreachStatusController(req, res, next) {
  try {
    const result = await updateCampaignLeadOutreachStatus(
      req.params.campaignId,
      req.params.campaignLeadId,
      req.body,
    )

    res.json({
      message: 'Campaign lead outreach status updated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
