import {
  getWorkflowSettings,
  updateWorkflowSettings,
} from './workflowSettings.service.js'

export async function getWorkflowSettingsController(_req, res, next) {
  try {
    res.json({
      message: 'Workflow settings fetched successfully.',
      data: await getWorkflowSettings(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateWorkflowSettingsController(req, res, next) {
  try {
    res.json({
      message: 'Workflow settings updated successfully.',
      data: await updateWorkflowSettings(req.body),
    })
  } catch (error) {
    next(error)
  }
}
