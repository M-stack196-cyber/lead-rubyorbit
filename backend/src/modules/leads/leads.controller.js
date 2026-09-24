import {
  getLeadDuplicateSummary,
  listImportedLeads,
  updateLeadMetadata,
} from './leads.service.js'

export async function listImportedLeadsController(req, res, next) {
  try {
    const result = await listImportedLeads(req.query)

    res.json({
      message: 'Leads fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateLeadMetadataController(req, res, next) {
  try {
    const result = await updateLeadMetadata(req.params.id, req.body)

    res.json({
      message: 'Lead metadata updated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getLeadDuplicateSummaryController(_req, res, next) {
  try {
    const result = await getLeadDuplicateSummary()

    res.json({
      message: 'Lead duplicate summary fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
