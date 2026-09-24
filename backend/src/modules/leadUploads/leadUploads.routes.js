import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { Router } from 'express'

import {
  confirmLeadUploadController,
  getLeadUploadPreviewController,
  listLeadUploadsController,
  uploadLeadFileController,
} from './leadUploads.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { sensitiveRateLimit } from '../../middleware/rateLimit.js'
import { auditAction } from '../../middleware/audit.js'

const uploadDir = path.resolve('uploads/raw')

fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = new Set([
      '.csv',
      '.xlsx',
      '.xls',
      '.json',
      '.txt',
      '.doc',
      '.docx',
      '.pdf',
    ])

    if (!allowedExtensions.has(extension)) {
      const error = new Error(`Unsupported file type: ${extension || 'unknown'}`)
      error.statusCode = 400
      cb(error)
      return
    }

    cb(null, true)
  },
})

export const leadUploadsRouter = Router()

leadUploadsRouter.get('/', listLeadUploadsController)
leadUploadsRouter.post(
  '/upload',
  sensitiveRateLimit('lead-upload'),
  requirePermission(permissions.LEAD_IMPORT),
  auditAction('lead_upload.upload', 'lead_upload'),
  upload.single('file'),
  uploadLeadFileController,
)
leadUploadsRouter.get('/:id/preview', getLeadUploadPreviewController)
leadUploadsRouter.post(
  '/:id/confirm',
  requirePermission(permissions.LEAD_IMPORT),
  auditAction('lead_upload.confirm', 'lead_upload', (req) => req.params.id),
  confirmLeadUploadController,
)
