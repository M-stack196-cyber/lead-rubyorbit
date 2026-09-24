import { listAuditLogs } from './auditLogs.service.js'

export async function listAuditLogsController(req, res, next) {
  try {
    const result = await listAuditLogs(req.query)

    res.json({
      message: 'Audit logs fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
