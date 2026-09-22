import {
  archiveNotification,
  createNotification,
  generateCampaignNotifications,
  getNotificationById,
  getNotificationSummary,
  listCampaignNotifications,
  listNotifications,
  markNotificationRead,
  resolveNotification,
} from './notifications.service.js'

export async function listNotificationsController(req, res, next) {
  try {
    const notifications = await listNotifications(req.query)
    res.json({ data: notifications })
  } catch (error) {
    next(error)
  }
}

export async function getNotificationSummaryController(_req, res, next) {
  try {
    const summary = await getNotificationSummary()
    res.json({ data: summary })
  } catch (error) {
    next(error)
  }
}

export async function getNotificationByIdController(req, res, next) {
  try {
    const notification = await getNotificationById(req.params.id)
    res.json({ data: notification })
  } catch (error) {
    next(error)
  }
}

export async function createNotificationController(req, res, next) {
  try {
    const notification = await createNotification(req.body)
    res.status(201).json({ data: notification })
  } catch (error) {
    next(error)
  }
}

export async function markNotificationReadController(req, res, next) {
  try {
    const notification = await markNotificationRead(req.params.id)
    res.json({ data: notification })
  } catch (error) {
    next(error)
  }
}

export async function resolveNotificationController(req, res, next) {
  try {
    const notification = await resolveNotification(req.params.id)
    res.json({ data: notification })
  } catch (error) {
    next(error)
  }
}

export async function archiveNotificationController(req, res, next) {
  try {
    const notification = await archiveNotification(req.params.id)
    res.json({ data: notification })
  } catch (error) {
    next(error)
  }
}

export async function listCampaignNotificationsController(req, res, next) {
  try {
    const notifications = await listCampaignNotifications(req.params.campaignId, req.query)
    res.json({ data: notifications })
  } catch (error) {
    next(error)
  }
}

export async function generateCampaignNotificationsController(req, res, next) {
  try {
    const result = await generateCampaignNotifications(req.params.campaignId)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}
