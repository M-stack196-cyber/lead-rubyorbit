import {
  confirmLeadUpload,
  getLeadUploadPreview,
  listLeadUploads,
  processLeadUpload,
} from './leadUploads.service.js'

export async function listLeadUploadsController(req, res, next) {
  try {
    const result = await listLeadUploads(req.query)

    res.json({
      message: 'Lead uploads fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function uploadLeadFileController(req, res, next) {
  try {
    const result = await processLeadUpload(req.file)

    res.status(201).json({
      message: 'Lead file parsed successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getLeadUploadPreviewController(req, res, next) {
  try {
    const result = await getLeadUploadPreview(req.params.id)

    res.json({
      message: 'Lead upload preview fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function confirmLeadUploadController(req, res, next) {
  try {
    const result = await confirmLeadUpload(req.params.id)

    res.json({
      message: 'Lead upload confirmed successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
