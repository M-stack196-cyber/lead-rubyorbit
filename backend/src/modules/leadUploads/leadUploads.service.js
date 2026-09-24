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
import { getCurrentWorkspaceId, scopeWorkspace, withWorkspaceFields } from '../../middleware/workspace.js'

const previewDir = path.resolve('uploads/lead-previews')

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

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

  const supabase = createSupabaseServiceClient()
  const workspaceId = getCurrentWorkspaceId()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  const previewRows = await annotateExistingDuplicates(
    supabase,
    validateLeads(rawLeads),
    workspaceId,
  )
  const summary = buildSummary(previewRows)

  const { data: uploadRecord, error: uploadError } = await supabase
    .from('lead_uploads')
    .insert(withWorkspaceFields({
      file_name: file.originalname,
      file_type: fileType.type,
      file_size: file.size,
      status: 'parsed',
      total_rows: summary.totalRows,
      valid_rows: summary.validRows,
      invalid_rows: summary.invalidRows,
      duplicate_rows: summary.duplicateRows,
    }, workspaceId))
    .select()
    .single()

  if (uploadError) {
    throw createHttpError(uploadError.message, 500)
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

export async function listLeadUploads(filters = {}) {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  const limit = Math.min(Math.max(Number(filters.limit || 100), 1), 250)
  let query = scopeWorkspace(
    supabase
      .from('lead_uploads')
      .select(
        `
          id,
          file_name,
          file_type,
          file_size,
          status,
          total_rows,
          valid_rows,
          invalid_rows,
          duplicate_rows,
          imported_rows,
          skipped_rows,
          confirmed_at,
          metadata,
          created_at
        `,
      ),
  )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    throw createHttpError(error.message, 500)
  }

  return (data || []).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    totalRows: row.total_rows,
    validRows: row.valid_rows,
    invalidRows: row.invalid_rows,
    duplicateRows: row.duplicate_rows,
    importedRows: row.imported_rows || 0,
    skippedRows: row.skipped_rows || 0,
    confirmedAt: row.confirmed_at,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }))
}

export async function confirmLeadUpload(uploadId) {
  const previewRows = await readPreview(uploadId)

  const validRows = previewRows.filter((row) => row.is_valid && !row.is_duplicate)
  const existingDuplicateRows = previewRows.filter((row) => row.duplicate_of_lead_id)

  if (!validRows.length) {
    if (existingDuplicateRows.length) {
      const supabase = createSupabaseServiceClient()
      const workspaceId = getCurrentWorkspaceId()

      if (!supabase) {
        throw createHttpError('Supabase service client is not configured.', 500)
      }

      await updateLeadUploadConfirmation(supabase, uploadId, previewRows, [], [], workspaceId)

      return {
        uploadId,
        importedCount: 0,
        skippedCount: previewRows.length,
        duplicateExistingCount: existingDuplicateRows.length,
      }
    }

    throw createHttpError('No valid leads available to import.')
  }

  const supabase = createSupabaseServiceClient()
  const workspaceId = getCurrentWorkspaceId()

  if (!supabase) {
    throw createHttpError('Supabase service client is not configured.', 500)
  }

  const existingByKey = await getExistingLeadMap(
    supabase,
    validRows.map(getLeadDedupeKey).filter(Boolean),
    workspaceId,
  )

  const rowsToInsert = []
  const duplicateRows = []

  for (const row of validRows) {
    const dedupeKey = getLeadDedupeKey(row)
    const existingLead = dedupeKey ? existingByKey.get(dedupeKey) : null

    if (existingLead) {
      duplicateRows.push(row)
      continue
    }

    rowsToInsert.push(row)
  }

  if (!rowsToInsert.length) {
    await updateLeadUploadConfirmation(supabase, uploadId, previewRows, [], duplicateRows, workspaceId)

    return {
      uploadId,
      importedCount: 0,
      skippedCount: previewRows.length,
      duplicateExistingCount: existingDuplicateRows.length + duplicateRows.length,
    }
  }

  const leadsToInsert = rowsToInsert.map((row) => ({
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
    tags: normalizeTags(row.tags),
    score: calculateLeadScore(row),
    normalized_email: normalizeEmail(row.email),
    dedupe_key: getLeadDedupeKey(row),
    last_imported_at: new Date().toISOString(),
    workspace_id: workspaceId,
  }))

  const { data: insertedLeads, error: insertError } = await supabase
    .from('leads')
    .insert(leadsToInsert)
    .select()

  if (insertError) {
    throw createHttpError(insertError.message, 500)
  }

  await updateLeadUploadConfirmation(
    supabase,
    uploadId,
    previewRows,
    insertedLeads,
    duplicateRows,
    workspaceId,
  )

  return {
    uploadId,
    importedCount: insertedLeads.length,
    skippedCount: previewRows.length - insertedLeads.length,
    duplicateExistingCount: existingDuplicateRows.length + duplicateRows.length,
  }
}

async function updateLeadUploadConfirmation(
  supabase,
  uploadId,
  previewRows,
  insertedLeads,
  duplicateRows,
  workspaceId,
) {
  const skippedRows = previewRows.length - insertedLeads.length
  const { error: updateError } = await scopeWorkspace(
    supabase.from('lead_uploads').update({
      status: 'confirmed',
      valid_rows: insertedLeads.length,
      invalid_rows: previewRows.filter((row) => row.row_status === 'invalid').length,
      duplicate_rows:
        previewRows.filter((row) => row.row_status === 'duplicate').length + duplicateRows.length,
      imported_rows: insertedLeads.length,
      skipped_rows: skippedRows,
      confirmed_at: new Date().toISOString(),
      metadata: {
        duplicateExistingRows: duplicateRows.length,
        duplicateUploadRows: previewRows.filter((row) => row.row_status === 'duplicate').length,
      },
    }),
    workspaceId,
  )
    .eq('id', uploadId)

  if (updateError) {
    throw createHttpError(updateError.message, 500)
  }
}

async function annotateExistingDuplicates(supabase, rows, workspaceId) {
  const existingByKey = await getExistingLeadMap(
    supabase,
    rows.map(getLeadDedupeKey).filter(Boolean),
    workspaceId,
  )

  return rows.map((row) => {
    const dedupeKey = getLeadDedupeKey(row)
    const existingLead = dedupeKey ? existingByKey.get(dedupeKey) : null

    if (!existingLead || row.row_status === 'invalid') {
      return {
        ...row,
        score: calculateLeadScore(row),
        tags: normalizeTags(row.tags),
        dedupe_key: dedupeKey,
      }
    }

    return {
      ...row,
      row_status: 'duplicate',
      warnings: [...(row.warnings || []), 'Duplicate of an existing workspace lead.'],
      is_duplicate: true,
      is_valid: false,
      duplicate_of_lead_id: existingLead.id,
      score: calculateLeadScore(row),
      tags: normalizeTags(row.tags),
      dedupe_key: dedupeKey,
    }
  })
}

async function getExistingLeadMap(supabase, dedupeKeys, workspaceId) {
  const uniqueKeys = [...new Set(dedupeKeys)].filter(Boolean)
  const existingByKey = new Map()

  if (!uniqueKeys.length) return existingByKey

  const { data, error } = await scopeWorkspace(
    supabase.from('leads').select('id, dedupe_key, email, phone'),
    workspaceId,
  )
    .in('dedupe_key', uniqueKeys)

  if (error) {
    throw createHttpError(error.message, 500)
  }

  for (const lead of data || []) {
    if (lead.dedupe_key && !existingByKey.has(lead.dedupe_key)) {
      existingByKey.set(lead.dedupe_key, lead)
    }
  }

  return existingByKey
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase() || null
}

function getLeadDedupeKey(row = {}) {
  return normalizeEmail(row.email) || String(row.phone || '').trim().toLowerCase() || null
}

function normalizeTags(tags = []) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
  }

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}

function calculateLeadScore(row = {}) {
  let score = 0
  if (row.email) score += 30
  if (row.name) score += 20
  if (row.company) score += 20
  if (row.phone) score += 10
  if (row.website) score += 10
  if (row.linkedin_url) score += 10
  return Math.min(score, 100)
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
