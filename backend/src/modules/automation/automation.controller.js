import {
  getAutomationStatus,
  runBackgroundAutomationCycle,
} from './automation.service.js'

export async function getAutomationStatusController(_req, res, next) {
  try {
    res.json({
      message: 'Automation status fetched successfully.',
      data: getAutomationStatus(),
    })
  } catch (error) {
    next(error)
  }
}

export async function runAutomationNowController(req, res, next) {
  try {
    const result = await runBackgroundAutomationCycle({
      ...req.body,
      trigger: 'manual_api',
    })

    res.status(result.skipped ? 202 : 201).json({
      message: result.skipped
        ? 'Automation cycle skipped because another run is already active.'
        : 'Automation cycle completed successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
