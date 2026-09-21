import { listImportedLeads } from './leads.service.js'

export async function listImportedLeadsController(_req, res, next) {
  try {
    const result = await listImportedLeads()

    res.json({
      message: 'Leads fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
