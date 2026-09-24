import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { confirmLeadUpload, getLeadUploads, uploadLeadFile } from '@/services/api'

const statusVariants = {
  valid: 'success',
  invalid: 'destructive',
  duplicate: 'warning',
  needs_review: 'secondary',
}

const summaryCards = [
  { key: 'totalRows', label: 'Total rows' },
  { key: 'validRows', label: 'Importable rows' },
  { key: 'invalidRows', label: 'Invalid rows' },
  { key: 'duplicateRows', label: 'Duplicate rows' },
  { key: 'needsReviewRows', label: 'Needs review' },
]

export function LeadUploadsPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const rows = uploadResult?.previewRows || []
  const canConfirm = Boolean(uploadResult?.uploadId && rows.some((row) => row.is_valid && !row.is_duplicate))

  const handleFile = useCallback((file) => {
    setSelectedFile(file)
    setUploadResult(null)
    setSuccess('')
    setError('')
  }, [])

  const loadUploadHistory = useCallback(async () => {
    try {
      setUploadHistory(await getLeadUploads({ limit: 50 }))
    } catch {
      setUploadHistory([])
    }
  }, [])

  useEffect(() => {
    loadUploadHistory()
  }, [loadUploadHistory])

  async function handleUpload() {
    if (!selectedFile) {
      setError('Choose a lead file before uploading.')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const result = await uploadLeadFile(selectedFile)
      setUploadResult(result)
      setSuccess('File parsed successfully. Review the rows before importing.')
      await loadUploadHistory()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleConfirm() {
    if (!uploadResult?.uploadId) return

    setIsConfirming(true)
    setError('')
    setSuccess('')

    try {
      const result = await confirmLeadUpload(uploadResult.uploadId)
      setSuccess(
        `Import complete: ${result.importedCount} imported, ${result.skippedCount} skipped, ${result.duplicateExistingCount || 0} existing duplicates.`,
      )
      await loadUploadHistory()
    } catch (confirmError) {
      setError(confirmError.message)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Phase 2 Lead Intake
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Lead Uploads</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Import lead files, review validation results, and confirm clean records into the
            leads table.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
          CSV, XLSX, JSON, TXT, DOCX, PDF
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Upload Source File</CardTitle>
            <CardDescription>
              Use the file field named by the API contract and keep raw uploads server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className={cn(
                'flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition',
                isDragging && 'border-primary bg-red-50',
              )}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragging(false)
                const file = event.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
            >
              <UploadCloud className="mb-3 h-9 w-9 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">
                {selectedFile ? selectedFile.name : 'Drop a lead file here or choose one'}
              </span>
              <span className="mt-2 text-xs text-slate-500">
                Supports .csv, .xlsx, .xls, .json, .txt, .doc, .docx, and .pdf files.
              </span>
              <input
                className="sr-only"
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt,.doc,.docx,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {selectedFile ? `${formatBytes(selectedFile.size)} selected` : 'No file selected'}
              </p>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                )}
                {isUploading ? 'Uploading' : 'Upload'}
              </button>
            </div>
          </CardContent>
        </Card>

        <StatusPanel error={error} success={success} />
      </section>

      {uploadResult ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <Card key={card.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-slate-600">{card.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-slate-950">
                    {uploadResult[card.key] ?? 0}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section>
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base text-slate-950">Preview Rows</CardTitle>
                  <CardDescription>{uploadResult.fileName}</CardDescription>
                </div>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm || isConfirming}
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isConfirming ? 'Importing' : 'Confirm Import'}
                </button>
              </CardHeader>
              <CardContent>
                <LeadPreviewTable rows={rows} />
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}

      <ImportHistory uploads={uploadHistory} />
    </>
  )
}

function ImportHistory({ uploads }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-950">Import History</CardTitle>
        <CardDescription>Recent parsed and confirmed lead files.</CardDescription>
      </CardHeader>
      <CardContent>
        {!uploads.length ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No import history found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rows</th>
                    <th className="px-4 py-3">Imported</th>
                    <th className="px-4 py-3">Skipped</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {uploads.map((upload) => (
                    <tr key={upload.id}>
                      <td className="min-w-56 px-4 py-3">
                        <p className="font-medium text-slate-900">{upload.fileName}</p>
                        <p className="text-xs text-slate-500">{upload.fileType}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{upload.status}</td>
                      <td className="px-4 py-3 text-slate-700">{upload.totalRows || 0}</td>
                      <td className="px-4 py-3 text-slate-700">{upload.importedRows || 0}</td>
                      <td className="px-4 py-3 text-slate-700">{upload.skippedRows || 0}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(upload.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusPanel({ error, success }) {
  const message = error || success || 'Upload a file to generate validation results.'
  const Icon = error ? AlertCircle : success ? CheckCircle2 : FileSpreadsheet

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-950">Current Status</CardTitle>
        <CardDescription>Parser and import feedback appears here.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'flex gap-3 rounded-md border px-3 py-3 text-sm',
            error && 'border-red-200 bg-red-50 text-red-800',
            success && 'border-emerald-200 bg-emerald-50 text-emerald-800',
            !error && !success && 'border-slate-200 bg-slate-50 text-slate-600',
          )}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function LeadPreviewTable({ rows }) {
  const visibleRows = useMemo(() => rows.slice(0, 100), [rows])

  if (!rows.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No preview rows available.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Messages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {visibleRows.map((row) => (
              <tr key={`${row.row_number}-${row.email}-${row.phone}`} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {row.row_number}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge variant={statusVariants[row.row_status] || 'secondary'}>
                    {row.row_status}
                  </Badge>
                </td>
                <td className="min-w-36 px-4 py-3 text-slate-700">{row.name || '-'}</td>
                <td className="min-w-48 px-4 py-3 text-slate-700">{row.email || '-'}</td>
                <td className="min-w-36 px-4 py-3 text-slate-700">{row.phone || '-'}</td>
                <td className="min-w-40 px-4 py-3 text-slate-700">{row.company || '-'}</td>
                <td className="min-w-64 px-4 py-3 text-slate-600">
                  {[...(row.errors || []), ...(row.warnings || [])].join(' ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > visibleRows.length ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing first {visibleRows.length} of {rows.length} rows.
        </div>
      ) : null}
    </div>
  )
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
