import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

import { createSupabaseServiceClient } from '../../config/supabase.js'
import { detectFileType } from './utils/fileTypeDetector.js'
import { validateLeads } from './validators/leadValidator.js'
import { parseCsvFile } from './parsers/csvParser.js'
import { parseXlsxFile } from './parsers/xlsxParser.js'
import { parseJsonFile } from './parsers/jsonParser.js'
import { parseTxtFile } from './parsers/txtParser.js'
import { parseDocxFile } from './parsers/docxParser.js'
import { parsePdfFile } from './parsers/pdfParser.js'

const previewDir = path.resolve('uploads/lead-previews')

export async function processLeadUpload(file) {
  if (!file) {
    const error = new Error('No file uploaded.')
    error.statusCode = 400
    throw error
  }

  const fileType = detectFileType(file.originalname)

  if (!fileType.supported) {
    const error = new Error(`Unsupported file type: ${fileType.extension || 'unknown'}`)
    error.statusCode = 400
    throw error
  }

  const rawLeads = await parseFileByType(file.path, fileType.type)

  if (!rawLeads.length) {
    const error = new Error('No lead data could be extracted from this file.')
    error.statusCode = 400
    throw error
  }

  const previewRows = validateLeads(rawLeads)
  const summary = buildSummary(previewRows)

  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  const { data: uploadRecord, error: uploadError } = await supabase
    .from('lead_uploads')
    .insert({
      file_name: file.originalname,
      file_type: fileType.type,
      file_size: file.size,
      status: 'parsed',
      total_rows: summary.totalRows,
      valid_rows: summary.validRows,
      invalid_rows: summary.invalidRows,
      duplicate_rows: summary.duplicateRows,
    })
    .select()
    .single()

  if (uploadError) {
    const error = new Error(uploadError.message)
    error.statusCode = 500
    throw error
  }

  await savePreview(uploadRecord.id, previewRows)

  return {
    uploadId: uploadRecord.id,
    fileName: file.originalname,
    fileType: fileType.type,
    ...summary,
    previewRows,
  }
}

export async function getLeadUploadPreview(uploadId) {
  const previewRows = await readPreview(uploadId)

  return {
    uploadId,
    previewRows,
    ...buildSummary(previewRows),
  }
}

export async function confirmLeadUpload(uploadId) {
  const previewRows = await readPreview(uploadId)

  const validRows = previewRows.filter((row) => row.is_valid && !row.is_duplicate)

  if (!validRows.length) {
    const error = new Error('No valid leads available to import.')
    error.statusCode = 400
    throw error
  }

  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  const leadsToInsert = validRows.map((row) => ({
    lead_upload_id: uploadId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    website: row.website,
    linkedin_url: row.linkedin_url,
    location: row.location,
    notes: row.notes,
    source: row.source || 'lead_upload',
    status: 'imported',
  }))

  const { data: insertedLeads, error: insertError } = await supabase
    .from('leads')
    .insert(leadsToInsert)
    .select()

  if (insertError) {
    const error = new Error(insertError.message)
    error.statusCode = 500
    throw error
  }

  const { error: updateError } = await supabase
    .from('lead_uploads')
    .update({
      status: 'confirmed',
      valid_rows: insertedLeads.length,
      invalid_rows: previewRows.filter((row) => row.row_status === 'invalid').length,
      duplicate_rows: previewRows.filter((row) => row.row_status === 'duplicate').length,
    })
    .eq('id', uploadId)

  if (updateError) {
    const error = new Error(updateError.message)
    error.statusCode = 500
    throw error
  }

  return {
    uploadId,
    importedCount: insertedLeads.length,
    skippedCount: previewRows.length - insertedLeads.length,
  }
}

async function parseFileByType(filePath, type) {
  switch (type) {
    case 'csv':
      return parseCsvFile(filePath)
    case 'xlsx':
      return parseXlsxFile(filePath)
    case 'json':
      return parseJsonFile(filePath)
    case 'txt':
      return parseTxtFile(filePath)
    case 'docx':
      return parseDocxFile(filePath)
    case 'pdf':
      return parsePdfFile(filePath)
    default:
      return []
  }
}

function buildSummary(rows = []) {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.row_status === 'valid' || row.row_status === 'needs_review').length,
    invalidRows: rows.filter((row) => row.row_status === 'invalid').length,
    duplicateRows: rows.filter((row) => row.row_status === 'duplicate').length,
    needsReviewRows: rows.filter((row) => row.row_status === 'needs_review').length,
  }
}

async function savePreview(uploadId, rows) {
  await fs.mkdir(previewDir, { recursive: true })
  const filePath = getPreviewFilePath(uploadId)
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2))
}

async function readPreview(uploadId) {
  const filePath = getPreviewFilePath(uploadId)

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    const error = new Error('Preview data not found for this upload.')
    error.statusCode = 404
    throw error
  }
}

function getPreviewFilePath(uploadId) {
  const safeId = uploadId || randomUUID()
  return path.join(previewDir, `${safeId}.json`)
}