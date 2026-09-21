import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CirclePlus,
  Loader2,
  Megaphone,
  RefreshCcw,
  UserPlus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  addLeadsToCampaign,
  createCampaign,
  getCampaignById,
  getCampaignLeads,
  getCampaigns,
  getLeads,
  updateCampaign,
} from '@/services/api'

const campaignStatuses = ['draft', 'active', 'paused', 'completed', 'archived']

const statusVariants = {
  active: 'success',
  archived: 'secondary',
  completed: 'secondary',
  draft: 'warning',
  paused: 'outline',
}

const defaultForm = {
  name: '',
  description: '',
  status: 'draft',
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [campaignLeads, setCampaignLeads] = useState([])
  const [availableLeads, setAvailableLeads] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const attachedLeadIds = useMemo(
    () => new Set(campaignLeads.map((row) => row.leadId)),
    [campaignLeads],
  )

  const attachableLeads = useMemo(
    () => availableLeads.filter((lead) => !attachedLeadIds.has(lead.id)),
    [availableLeads, attachedLeadIds],
  )

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [campaignList, leadList] = await Promise.all([getCampaigns(), getLeads()])
      setCampaigns(campaignList)
      setAvailableLeads(leadList)

      setSelectedCampaignId((currentCampaignId) => currentCampaignId || campaignList[0]?.id || '')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCampaignDetail = useCallback(async (campaignId) => {
    setIsDetailLoading(true)
    setError('')

    try {
      const [campaign, leads] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignLeads(campaignId),
      ])
      setSelectedCampaign(campaign)
      setCampaignLeads(leads)
      setSelectedLeadIds([])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignDetail(selectedCampaignId)
    } else {
      setSelectedCampaign(null)
      setCampaignLeads([])
    }
  }, [loadCampaignDetail, selectedCampaignId])

  async function handleCreateCampaign(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const createdCampaign = await createCampaign(form)
      setForm(defaultForm)
      setSuccess('Campaign created.')
      setCampaigns((currentCampaigns) => [createdCampaign, ...currentCampaigns])
      setSelectedCampaignId(createdCampaign.id)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusUpdate(status) {
    if (!selectedCampaign) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const updatedCampaign = await updateCampaign(selectedCampaign.id, { status })
      setSelectedCampaign((currentCampaign) => ({ ...currentCampaign, ...updatedCampaign }))
      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((campaign) =>
          campaign.id === selectedCampaign.id ? { ...campaign, ...updatedCampaign } : campaign,
        ),
      )
      setSuccess('Campaign status updated.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAttachLeads() {
    if (!selectedCampaignId || !selectedLeadIds.length) return

    setIsAttaching(true)
    setError('')
    setSuccess('')

    try {
      const result = await addLeadsToCampaign(selectedCampaignId, selectedLeadIds)
      setSuccess(`${result.addedCount} lead(s) attached, ${result.skippedCount} skipped.`)
      await Promise.all([loadCampaigns(), loadCampaignDetail(selectedCampaignId)])
    } catch (attachError) {
      setError(attachError.message)
    } finally {
      setIsAttaching(false)
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Phase 3 Campaign Foundation
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Campaigns</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Create campaign shells, track status, and attach imported leads for later outreach
            phases.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          type="button"
          onClick={loadCampaigns}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      <StatusMessage error={error} success={success} />

      <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <CreateCampaignCard
          form={form}
          isSaving={isSaving}
          onChange={setForm}
          onSubmit={handleCreateCampaign}
        />

        <CampaignListCard
          campaigns={campaigns}
          isLoading={isLoading}
          selectedCampaignId={selectedCampaignId}
          onSelect={setSelectedCampaignId}
        />
      </section>

      <section>
        <CampaignDetailCard
          attachableLeads={attachableLeads}
          campaign={selectedCampaign}
          campaignLeads={campaignLeads}
          isAttaching={isAttaching}
          isDetailLoading={isDetailLoading}
          isSaving={isSaving}
          selectedLeadIds={selectedLeadIds}
          onAttach={handleAttachLeads}
          onLeadSelection={setSelectedLeadIds}
          onStatusUpdate={handleStatusUpdate}
        />
      </section>
    </>
  )
}

function StatusMessage({ error, success }) {
  if (!error && !success) return null

  const Icon = error ? AlertCircle : CheckCircle2

  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border px-3 py-3 text-sm',
        error && 'border-red-200 bg-red-50 text-red-800',
        success && 'border-emerald-200 bg-emerald-50 text-emerald-800',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{error || success}</span>
    </div>
  )
}

function CreateCampaignCard({ form, isSaving, onChange, onSubmit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-950">Create Campaign</CardTitle>
        <CardDescription>Name, notes, and current lifecycle status.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="campaign-name">
              Name
            </label>
            <input
              className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="campaign-name"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Q4 founder outreach"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="campaign-description">
              Description
            </label>
            <textarea
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="campaign-description"
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Audience, positioning, or internal notes"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="campaign-status">
              Status
            </label>
            <select
              className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="campaign-status"
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value })}
            >
              {campaignStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
            )}
            Create Campaign
          </button>
        </form>
      </CardContent>
    </Card>
  )
}

function CampaignListCard({ campaigns, isLoading, selectedCampaignId, onSelect }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base text-slate-950">Campaign List</CardTitle>
          <CardDescription>{campaigns.length} campaign(s) in the workspace.</CardDescription>
        </div>
        <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading campaigns
          </div>
        ) : campaigns.length ? (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className={cn(
                        'cursor-pointer align-top transition hover:bg-slate-50',
                        selectedCampaignId === campaign.id && 'bg-red-50/60',
                      )}
                      onClick={() => onSelect(campaign.id)}
                    >
                      <td className="min-w-56 px-4 py-3">
                        <p className="font-medium text-slate-950">{campaign.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {campaign.description || 'No description'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {campaign.leadCount || 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(campaign.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState text="No campaigns yet. Create the first campaign to begin Phase 3 setup." />
        )}
      </CardContent>
    </Card>
  )
}

function CampaignDetailCard({
  attachableLeads,
  campaign,
  campaignLeads,
  isAttaching,
  isDetailLoading,
  isSaving,
  selectedLeadIds,
  onAttach,
  onLeadSelection,
  onStatusUpdate,
}) {
  if (isDetailLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-44 items-center justify-center p-6 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading campaign details
        </CardContent>
      </Card>
    )
  }

  if (!campaign) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState text="Select a campaign to view details and attach imported leads." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="text-base text-slate-950">{campaign.name}</CardTitle>
          <CardDescription>{campaign.description || 'No description'}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StatusBadge status={campaign.status} />
          <select
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={campaign.status}
            onChange={(event) => onStatusUpdate(event.target.value)}
            disabled={isSaving}
          >
            {campaignStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Lead count" value={campaign.leadCount || campaignLeads.length} />
          <InfoTile label="Created" value={formatDate(campaign.created_at)} />
          <InfoTile label="Updated" value={formatDate(campaign.updated_at)} />
        </div>

        <AttachLeadsPanel
          attachableLeads={attachableLeads}
          isAttaching={isAttaching}
          selectedLeadIds={selectedLeadIds}
          onAttach={onAttach}
          onLeadSelection={onLeadSelection}
        />

        <CampaignLeadsTable campaignLeads={campaignLeads} />
      </CardContent>
    </Card>
  )
}

function AttachLeadsPanel({
  attachableLeads,
  isAttaching,
  selectedLeadIds,
  onAttach,
  onLeadSelection,
}) {
  function toggleLead(leadId) {
    if (selectedLeadIds.includes(leadId)) {
      onLeadSelection(selectedLeadIds.filter((id) => id !== leadId))
      return
    }

    onLeadSelection([...selectedLeadIds, leadId])
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Attach Imported Leads</h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose imported leads that are not already in this campaign.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onAttach}
          disabled={!selectedLeadIds.length || isAttaching}
        >
          {isAttaching ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          Attach Leads
        </button>
      </div>

      {attachableLeads.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {attachableLeads.slice(0, 12).map((lead) => (
            <label
              className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition hover:border-slate-300"
              key={lead.id}
            >
              <input
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                type="checkbox"
                checked={selectedLeadIds.includes(lead.id)}
                onChange={() => toggleLead(lead.id)}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-950">
                  {lead.name || lead.company || lead.email || 'Unnamed lead'}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {lead.email || lead.phone || lead.company || 'No contact detail'}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
          No imported leads available to attach.
        </p>
      )}
    </div>
  )
}

function CampaignLeadsTable({ campaignLeads }) {
  if (!campaignLeads.length) {
    return <EmptyState text="No leads are attached to this campaign yet." />
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Outreach</th>
              <th className="px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {campaignLeads.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="min-w-56 px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {row.lead?.name || row.lead?.email || 'Unnamed lead'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.lead?.email || row.lead?.phone || 'No contact detail'}
                  </p>
                </td>
                <td className="min-w-40 px-4 py-3 text-slate-700">
                  {row.lead?.company || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {row.outreachStatus || 'pending'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  return <Badge variant={statusVariants[status] || 'secondary'}>{status}</Badge>
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value || '-'}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
