import { createElement, useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCcw, Save, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLeadDuplicateSummary, getLeads, updateLeadMetadata } from '@/services/api'

export function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    tags: '',
    minScore: '',
    duplicates: '',
  })
  const [editing, setEditing] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingLeadId, setSavingLeadId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadLeads = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [leadRows, duplicateRows] = await Promise.all([
        getLeads({
          ...filters,
          limit: 250,
        }),
        getLeadDuplicateSummary(),
      ])
      setLeads(leadRows)
      setDuplicates(duplicateRows)
      setEditing(
        Object.fromEntries(
          leadRows.map((lead) => [
            lead.id,
            {
              score: lead.score || 0,
              tags: (lead.tags || []).join(', '),
            },
          ]),
        ),
      )
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  async function saveMetadata(leadId) {
    setSavingLeadId(leadId)
    setError('')
    setSuccess('')

    try {
      const payload = editing[leadId] || {}
      const updated = await updateLeadMetadata(leadId, {
        score: Number(payload.score || 0),
        tags: String(payload.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      setLeads((current) => current.map((lead) => (lead.id === leadId ? updated : lead)))
      setSuccess('Lead metadata saved.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingLeadId('')
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">Lead Database</Badge>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
            <Users className="h-7 w-7 text-slate-500" aria-hidden="true" />
            Leads
          </h1>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={loadLeads}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </button>
      </header>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">{success}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile label="Loaded leads" value={leads.length} />
        <InfoTile label="Duplicate groups" value={duplicates.length} />
        <InfoTile label="Avg score" value={averageScore(leads)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Search & Filters</CardTitle>
          <CardDescription>Find leads by text, status, source, tags, score, or duplicates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterInput label="Search" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} />
          <FilterInput label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
          <FilterInput label="Source" value={filters.source} onChange={(value) => setFilters((current) => ({ ...current, source: value }))} />
          <FilterInput label="Tags" value={filters.tags} onChange={(value) => setFilters((current) => ({ ...current, tags: value }))} />
          <FilterInput label="Min score" type="number" value={filters.minScore} onChange={(value) => setFilters((current) => ({ ...current, minScore: value }))} />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Duplicates
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={filters.duplicates}
              onChange={(event) => setFilters((current) => ({ ...current, duplicates: event.target.value }))}
            >
              <option value="">All</option>
              <option value="exclude">Exclude</option>
              <option value="only">Only</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Lead Records</CardTitle>
          <CardDescription>{leads.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Loading
            </div>
          ) : (
            <LeadsTable
              editing={editing}
              leads={leads}
              onEdit={setEditing}
              onSave={saveMetadata}
              savingLeadId={savingLeadId}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}

function FilterInput({ label, onChange, type = 'text', value }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function LeadsTable({ editing, leads, onEdit, onSave, savingLeadId }) {
  if (!leads.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No leads found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {leads.map((lead) => (
              <tr className="align-top" key={lead.id}>
                <td className="min-w-64 px-4 py-3">
                  <p className="font-medium text-slate-900">{lead.name || 'Unnamed lead'}</p>
                  <p className="text-slate-600">{lead.email || lead.phone || 'No contact'}</p>
                  {lead.duplicateOfLeadId ? <p className="text-xs text-amber-700">Duplicate lead</p> : null}
                </td>
                <td className="min-w-40 px-4 py-3 text-slate-700">{formatValue(lead.company)}</td>
                <td className="min-w-32 px-4 py-3 text-slate-700">{formatValue(lead.status)}</td>
                <td className="min-w-36 px-4 py-3 text-slate-700">{formatValue(lead.source)}</td>
                <td className="min-w-28 px-4 py-3">
                  <input
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    type="number"
                    min="0"
                    max="100"
                    value={editing[lead.id]?.score ?? 0}
                    onChange={(event) => onEdit((current) => ({
                      ...current,
                      [lead.id]: { ...(current[lead.id] || {}), score: event.target.value },
                    }))}
                  />
                </td>
                <td className="min-w-64 px-4 py-3">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={editing[lead.id]?.tags ?? ''}
                    onChange={(event) => onEdit((current) => ({
                      ...current,
                      [lead.id]: { ...(current[lead.id] || {}), tags: event.target.value },
                    }))}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => onSave(lead.id)}
                    disabled={savingLeadId === lead.id}
                  >
                    {savingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-600">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  )
}

function averageScore(leads) {
  if (!leads.length) return 0
  return Math.round(leads.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / leads.length)
}

export function RecordsPage({ badge, columns, icon: Icon, loader, title }) {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRows = useCallback(async function loadRows() {
    setIsLoading(true)
    setError('')

    try {
      setRows(await loader())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [loader])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">{badge}</Badge>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
            {createElement(Icon, { className: 'h-7 w-7 text-slate-500', 'aria-hidden': true })}
            {title}
          </h1>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={loadRows}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </button>
      </header>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">{title}</CardTitle>
          <CardDescription>{rows.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Loading
            </div>
          ) : rows.length ? (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                    <tr>
                      {columns.map(([, label]) => <th className="px-4 py-3" key={label}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        {columns.map(([key]) => (
                          <td className="min-w-40 px-4 py-3 text-slate-700" key={key}>
                            {formatValue(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No records found.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).replaceAll('_', ' ')
}
