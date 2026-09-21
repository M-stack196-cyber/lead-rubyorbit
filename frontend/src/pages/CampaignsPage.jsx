import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CirclePlus,
  Edit3,
  FileText,
  Loader2,
  MailCheck,
  Megaphone,
  RefreshCcw,
  RotateCcw,
  Send,
  SendToBack,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  addLeadsToCampaign,
  approveEmailDraft,
  createCampaign,
  createEmailDraft,
  getCampaignById,
  getCampaignEmailDrafts,
  getCampaignGhlSyncStatus,
  getCampaignLeads,
  getCampaignSentEmails,
  getCampaigns,
  getEmailAccounts,
  getEmailSendingStatus,
  getGhlSettingsStatus,
  getLeads,
  rejectEmailDraft,
  retryFailedGhlSync,
  sendCampaignEmails,
  sendEmailDraft,
  syncCampaignToGhl,
  updateCampaign,
  updateEmailDraft,
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

const defaultDraftForm = {
  campaignLeadId: '',
  draftType: 'primary',
  subject: '',
  body: '',
  rejectedReason: '',
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [campaignLeads, setCampaignLeads] = useState([])
  const [emailDrafts, setEmailDrafts] = useState([])
  const [emailAccounts, setEmailAccounts] = useState([])
  const [emailSendingStatus, setEmailSendingStatus] = useState(null)
  const [sentEmails, setSentEmails] = useState([])
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('')
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [draftForm, setDraftForm] = useState(defaultDraftForm)
  const [ghlSettings, setGhlSettings] = useState(null)
  const [ghlSyncStatus, setGhlSyncStatus] = useState(null)
  const [availableLeads, setAvailableLeads] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isGhlLoading, setIsGhlLoading] = useState(false)
  const [isGhlSyncing, setIsGhlSyncing] = useState(false)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isEmailSending, setIsEmailSending] = useState(false)
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
      const [campaign, leads, settings, syncStatus, drafts, sendStatus, sentEmailList, accounts] =
        await Promise.all([
          getCampaignById(campaignId),
          getCampaignLeads(campaignId),
          getGhlSettingsStatus(),
          getCampaignGhlSyncStatus(campaignId),
          getCampaignEmailDrafts(campaignId),
          getEmailSendingStatus(),
          getCampaignSentEmails(campaignId),
          getEmailAccounts(),
        ])
      setSelectedCampaign(campaign)
      setCampaignLeads(leads)
      setGhlSettings(settings)
      setGhlSyncStatus(syncStatus)
      setEmailDrafts(drafts)
      setEmailSendingStatus(sendStatus)
      setSentEmails(sentEmailList)
      setEmailAccounts(accounts)
      setSelectedEmailAccountId((currentAccountId) => {
        const isCurrentAvailable = accounts.some(
          (account) =>
            account.id === currentAccountId && account.isEnabled && account.status === 'active',
        )

        if (isCurrentAvailable) return currentAccountId

        return (
          accounts.find((account) => account.isEnabled && account.status === 'active')?.id || ''
        )
      })
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
      setEmailDrafts([])
      setSentEmails([])
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

  async function reloadGhlStatus(campaignId = selectedCampaignId) {
    if (!campaignId) return

    setIsGhlLoading(true)
    setError('')

    try {
      const [settings, syncStatus] = await Promise.all([
        getGhlSettingsStatus(),
        getCampaignGhlSyncStatus(campaignId),
      ])
      setGhlSettings(settings)
      setGhlSyncStatus(syncStatus)
    } catch (ghlError) {
      setError(ghlError.message)
    } finally {
      setIsGhlLoading(false)
    }
  }

  async function handleSyncToGhl() {
    if (!selectedCampaignId) return

    setIsGhlSyncing(true)
    setError('')
    setSuccess('')

    try {
      const result = await syncCampaignToGhl(selectedCampaignId)
      setSuccess(
        `GHL sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed.`,
      )
      await Promise.all([reloadGhlStatus(selectedCampaignId), loadCampaignDetail(selectedCampaignId)])
    } catch (ghlError) {
      setError(ghlError.message)
    } finally {
      setIsGhlSyncing(false)
    }
  }

  async function handleRetryFailedGhlSync() {
    if (!selectedCampaignId) return

    setIsGhlSyncing(true)
    setError('')
    setSuccess('')

    try {
      const result = await retryFailedGhlSync(selectedCampaignId)
      setSuccess(
        `GHL retry complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed.`,
      )
      await Promise.all([reloadGhlStatus(selectedCampaignId), loadCampaignDetail(selectedCampaignId)])
    } catch (ghlError) {
      setError(ghlError.message)
    } finally {
      setIsGhlSyncing(false)
    }
  }

  function handleSelectDraft(draft) {
    setSelectedDraftId(draft.id)
    setDraftForm({
      campaignLeadId: draft.campaignLeadId || '',
      draftType: draft.draftType || 'primary',
      subject: draft.subject || '',
      body: draft.body || '',
      rejectedReason: draft.rejectedReason || '',
    })
  }

  function resetDraftForm() {
    setSelectedDraftId('')
    setDraftForm(defaultDraftForm)
  }

  async function reloadEmailDrafts(campaignId = selectedCampaignId) {
    if (!campaignId) return

    const drafts = await getCampaignEmailDrafts(campaignId)
    setEmailDrafts(drafts)
  }

  async function reloadEmailSending(campaignId = selectedCampaignId) {
    if (!campaignId) return

    const [sendStatus, sentEmailList, accounts] = await Promise.all([
      getEmailSendingStatus(),
      getCampaignSentEmails(campaignId),
      getEmailAccounts(),
    ])

    setEmailSendingStatus(sendStatus)
    setSentEmails(sentEmailList)
    setEmailAccounts(accounts)
  }

  async function handleSaveDraft(event) {
    event.preventDefault()
    if (!selectedCampaignId) return

    const selectedCampaignLead = campaignLeads.find((row) => row.id === draftForm.campaignLeadId)

    setIsDraftSaving(true)
    setError('')
    setSuccess('')

    try {
      if (selectedDraftId) {
        await updateEmailDraft(selectedDraftId, {
          draftType: draftForm.draftType,
          subject: draftForm.subject,
          body: draftForm.body,
          status: 'saved',
        })
        setSuccess('Email draft updated.')
      } else {
        await createEmailDraft({
          campaignId: selectedCampaignId,
          leadId: selectedCampaignLead?.leadId,
          campaignLeadId: selectedCampaignLead?.id,
          draftType: draftForm.draftType,
          subject: draftForm.subject,
          body: draftForm.body,
        })
        setSuccess('Email draft saved.')
      }

      resetDraftForm()
      await reloadEmailDrafts(selectedCampaignId)
    } catch (draftError) {
      setError(draftError.message)
    } finally {
      setIsDraftSaving(false)
    }
  }

  async function handleApproveDraft(draftId = selectedDraftId) {
    if (!draftId) return

    setIsDraftSaving(true)
    setError('')
    setSuccess('')

    try {
      await approveEmailDraft(draftId)
      setSuccess('Email draft approved. No email was sent.')
      resetDraftForm()
      await reloadEmailDrafts(selectedCampaignId)
    } catch (draftError) {
      setError(draftError.message)
    } finally {
      setIsDraftSaving(false)
    }
  }

  async function handleRejectDraft(draftId = selectedDraftId, reason = draftForm.rejectedReason) {
    if (!draftId) return

    setIsDraftSaving(true)
    setError('')
    setSuccess('')

    try {
      await rejectEmailDraft(draftId, reason)
      setSuccess('Email draft rejected. No email was sent.')
      resetDraftForm()
      await reloadEmailDrafts(selectedCampaignId)
    } catch (draftError) {
      setError(draftError.message)
    } finally {
      setIsDraftSaving(false)
    }
  }

  async function handleSendDraft(draftId) {
    if (!draftId || !selectedEmailAccountId) return

    setIsEmailSending(true)
    setError('')
    setSuccess('')

    try {
      const sentEmail = await sendEmailDraft(draftId, selectedEmailAccountId)
      setSuccess(`Mock email sent. Message ID: ${sentEmail.messageId}.`)
      await Promise.all([
        reloadEmailDrafts(selectedCampaignId),
        reloadEmailSending(selectedCampaignId),
      ])
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsEmailSending(false)
    }
  }

  async function handleSendCampaignEmails() {
    if (!selectedCampaignId || !selectedEmailAccountId) return

    setIsEmailSending(true)
    setError('')
    setSuccess('')

    try {
      const result = await sendCampaignEmails(selectedCampaignId, selectedEmailAccountId)
      setSuccess(
        `Campaign send complete: ${result.sent} sent, ${result.skipped} skipped, ${result.blocked} blocked, ${result.failed} failed.`,
      )
      await Promise.all([
        reloadEmailDrafts(selectedCampaignId),
        reloadEmailSending(selectedCampaignId),
      ])
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsEmailSending(false)
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Campaign Operations
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
          draftForm={draftForm}
          emailDrafts={emailDrafts}
          emailAccounts={emailAccounts}
          emailSendingStatus={emailSendingStatus}
          isAttaching={isAttaching}
          isDetailLoading={isDetailLoading}
          isEmailSending={isEmailSending}
          isGhlLoading={isGhlLoading}
          isGhlSyncing={isGhlSyncing}
          isDraftSaving={isDraftSaving}
          isSaving={isSaving}
          ghlSettings={ghlSettings}
          ghlSyncStatus={ghlSyncStatus}
          selectedDraftId={selectedDraftId}
          selectedEmailAccountId={selectedEmailAccountId}
          selectedLeadIds={selectedLeadIds}
          sentEmails={sentEmails}
          onAttach={handleAttachLeads}
          onGhlRefresh={() => reloadGhlStatus()}
          onGhlRetryFailed={handleRetryFailedGhlSync}
          onGhlSync={handleSyncToGhl}
          onDraftApprove={handleApproveDraft}
          onDraftChange={setDraftForm}
          onDraftReject={handleRejectDraft}
          onDraftReset={resetDraftForm}
          onDraftSave={handleSaveDraft}
          onDraftSelect={handleSelectDraft}
          onEmailAccountChange={setSelectedEmailAccountId}
          onSendCampaignEmails={handleSendCampaignEmails}
          onSendDraft={handleSendDraft}
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
  draftForm,
  emailAccounts,
  emailDrafts,
  emailSendingStatus,
  ghlSettings,
  ghlSyncStatus,
  isAttaching,
  isDetailLoading,
  isEmailSending,
  isGhlLoading,
  isGhlSyncing,
  isDraftSaving,
  isSaving,
  selectedEmailAccountId,
  selectedLeadIds,
  selectedDraftId,
  sentEmails,
  onAttach,
  onGhlRefresh,
  onGhlRetryFailed,
  onGhlSync,
  onDraftApprove,
  onDraftChange,
  onDraftReject,
  onDraftReset,
  onDraftSave,
  onDraftSelect,
  onEmailAccountChange,
  onLeadSelection,
  onSendCampaignEmails,
  onSendDraft,
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

        <GhlSyncPanel
          ghlSettings={ghlSettings}
          ghlSyncStatus={ghlSyncStatus}
          isGhlLoading={isGhlLoading}
          isGhlSyncing={isGhlSyncing}
          onRefresh={onGhlRefresh}
          onRetryFailed={onGhlRetryFailed}
          onSync={onGhlSync}
        />

        <EmailDraftsPanel
          campaignLeads={campaignLeads}
          draftForm={draftForm}
          emailDrafts={emailDrafts}
          isDraftSaving={isDraftSaving}
          selectedDraftId={selectedDraftId}
          onApprove={onDraftApprove}
          onChange={onDraftChange}
          onReject={onDraftReject}
          onReset={onDraftReset}
          onSave={onDraftSave}
          onSelect={onDraftSelect}
        />

        <EmailSendingPanel
          emailAccounts={emailAccounts}
          emailDrafts={emailDrafts}
          emailSendingStatus={emailSendingStatus}
          isEmailSending={isEmailSending}
          selectedEmailAccountId={selectedEmailAccountId}
          sentEmails={sentEmails}
          onAccountChange={onEmailAccountChange}
          onSendCampaign={onSendCampaignEmails}
          onSendDraft={onSendDraft}
        />

        <CampaignLeadsTable campaignLeads={campaignLeads} />
      </CardContent>
    </Card>
  )
}

function GhlSyncPanel({
  ghlSettings,
  ghlSyncStatus,
  isGhlLoading,
  isGhlSyncing,
  onRefresh,
  onRetryFailed,
  onSync,
}) {
  const summary = ghlSyncStatus?.summary || {
    total: 0,
    synced: 0,
    pending: 0,
    failed: 0,
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">GoHighLevel Sync</h3>
          <p className="mt-1 text-sm text-slate-500">
            Prepare campaign leads for future GoHighLevel contact and workflow sync.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onRefresh}
            disabled={isGhlLoading || isGhlSyncing}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onRetryFailed}
            disabled={isGhlLoading || isGhlSyncing || !summary.failed}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry Failed
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onSync}
            disabled={isGhlLoading || isGhlSyncing || !summary.total}
          >
            {isGhlSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendToBack className="h-4 w-4" aria-hidden="true" />
            )}
            Sync Campaign Leads
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoTile label="GHL mode" value={ghlSettings?.mode || '-'} />
        <InfoTile label="Credentials" value={ghlSettings?.credentialStatus || '-'} />
        <InfoTile label="API base" value={ghlSettings?.apiBaseUrl || '-'} />
      </div>

      {ghlSettings?.mockMode ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Mock mode active. No real GoHighLevel contacts will be created.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="Total" value={summary.total} />
        <InfoTile label="Synced" value={summary.synced} />
        <InfoTile label="Pending" value={summary.pending} />
        <InfoTile label="Failed" value={summary.failed} />
      </div>

      <GhlSyncStatusTable rows={ghlSyncStatus?.rows || []} />
    </div>
  )
}

function GhlSyncStatusTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No campaign leads are available for GHL sync.
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">GHL Status</th>
              <th className="px-4 py-3">Contact ID</th>
              <th className="px-4 py-3">Synced</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="min-w-52 px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {row.leadName || row.email || 'Unnamed lead'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{row.email || 'No email'}</p>
                </td>
                <td className="min-w-36 px-4 py-3 text-slate-700">{row.company || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SyncBadge status={row.ghlSyncStatus} />
                </td>
                <td className="min-w-56 px-4 py-3 text-slate-700">
                  {row.ghlContactId || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(row.ghlSyncedAt)}
                </td>
                <td className="min-w-48 px-4 py-3 text-slate-700">
                  {row.ghlSyncError || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmailDraftsPanel({
  campaignLeads,
  draftForm,
  emailDrafts,
  isDraftSaving,
  selectedDraftId,
  onApprove,
  onChange,
  onReject,
  onReset,
  onSave,
  onSelect,
}) {
  const summary = {
    total: emailDrafts.length,
    saved: emailDrafts.filter((draft) => draft.status === 'saved').length,
    approved: emailDrafts.filter((draft) => draft.status === 'approved').length,
    rejected: emailDrafts.filter((draft) => draft.status === 'rejected').length,
  }
  const selectedDraft = emailDrafts.find((draft) => draft.id === selectedDraftId)
  const isApproved = selectedDraft?.status === 'approved'

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Email Drafts</h3>
          <p className="mt-1 text-sm text-slate-500">
            Draft approval only. Emails are not sent in this phase.
          </p>
        </div>
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="Total" value={summary.total} />
        <InfoTile label="Saved" value={summary.saved} />
        <InfoTile label="Approved" value={summary.approved} />
        <InfoTile label="Rejected" value={summary.rejected} />
      </div>

      <form className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4" onSubmit={onSave}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="draft-lead">
              Campaign lead
            </label>
            <select
              className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              id="draft-lead"
              value={draftForm.campaignLeadId}
              onChange={(event) => onChange({ ...draftForm, campaignLeadId: event.target.value })}
              disabled={Boolean(selectedDraftId)}
            >
              <option value="">Select a campaign lead</option>
              {campaignLeads.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.lead?.name || row.lead?.email || 'Unnamed lead'} -{' '}
                  {row.lead?.company || 'No company'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="draft-type">
              Draft type
            </label>
            <select
              className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              id="draft-type"
              value={draftForm.draftType}
              onChange={(event) => onChange({ ...draftForm, draftType: event.target.value })}
              disabled={isApproved}
            >
              <option value="primary">primary</option>
              <option value="manual">manual</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="draft-subject">
            Subject
          </label>
          <input
            className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            id="draft-subject"
            value={draftForm.subject}
            onChange={(event) => onChange({ ...draftForm, subject: event.target.value })}
            placeholder="Quick intro"
            disabled={isApproved}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="draft-body">
            Body
          </label>
          <textarea
            className="mt-1 min-h-40 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            id="draft-body"
            value={draftForm.body}
            onChange={(event) => onChange({ ...draftForm, body: event.target.value })}
            placeholder="Write the draft copy for team review."
            disabled={isApproved}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="draft-reject-reason">
            Rejection reason
          </label>
          <input
            className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="draft-reject-reason"
            value={draftForm.rejectedReason}
            onChange={(event) => onChange({ ...draftForm, rejectedReason: event.target.value })}
            placeholder="Optional reason when rejecting"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isDraftSaving || isApproved}
          >
            {isDraftSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            {selectedDraftId ? 'Save Changes' : 'Save Draft'}
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => onApprove(selectedDraftId)}
            disabled={!selectedDraftId || isDraftSaving || isApproved}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Approve
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => onReject(selectedDraftId, draftForm.rejectedReason)}
            disabled={!selectedDraftId || isDraftSaving}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={onReset}
          >
            Clear
          </button>
        </div>
      </form>

      <EmailDraftsTable
        emailDrafts={emailDrafts}
        onApprove={onApprove}
        onReject={onReject}
        onSelect={onSelect}
      />
    </div>
  )
}

function EmailDraftsTable({ emailDrafts, onApprove, onReject, onSelect }) {
  if (!emailDrafts.length) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No email drafts yet.
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {emailDrafts.map((draft) => (
              <tr key={draft.id} className="align-top">
                <td className="min-w-52 px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {draft.lead?.name || draft.lead?.email || 'Unnamed lead'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{draft.lead?.email || 'No email'}</p>
                </td>
                <td className="min-w-36 px-4 py-3 text-slate-700">
                  {draft.lead?.company || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {draft.draftType}
                </td>
                <td className="min-w-56 px-4 py-3 text-slate-700">{draft.subject}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <DraftStatusBadge status={draft.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(draft.updatedAt)}
                </td>
                <td className="min-w-52 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      type="button"
                      onClick={() => onSelect(draft)}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() => onApprove(draft.id)}
                      disabled={draft.status === 'approved'}
                    >
                      Approve
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                      type="button"
                      onClick={() => onReject(draft.id, draft.rejectedReason || '')}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmailSendingPanel({
  emailAccounts,
  emailDrafts,
  emailSendingStatus,
  isEmailSending,
  selectedEmailAccountId,
  sentEmails,
  onAccountChange,
  onSendCampaign,
  onSendDraft,
}) {
  const activeAccounts = emailAccounts.filter(
    (account) => account.isEnabled && account.status === 'active',
  )
  const approvedDrafts = emailDrafts.filter((draft) => draft.status === 'approved')
  const selectedAccount = activeAccounts.find((account) => account.id === selectedEmailAccountId)
  const isLiveMode = emailSendingStatus?.mode === 'live'
  const hasActiveAccount = Boolean(selectedEmailAccountId)
  const liveBlockedReason =
    isLiveMode && hasActiveAccount && selectedAccount?.provider !== 'gmail'
      ? 'Live sending supports Gmail accounts only.'
      : isLiveMode && hasActiveAccount && selectedAccount?.gmailTokenStatus !== 'connected'
        ? 'Gmail must be connected with Google OAuth before live sending.'
        : ''
  const canSend = hasActiveAccount && !liveBlockedReason

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Send Approved Emails</h3>
          <p className="mt-1 text-sm text-slate-500">
            {isLiveMode
              ? 'Live mode sends through connected Gmail accounts.'
              : 'Mock sending only. Emails are not sent outside LeadRubyOrbit in this mode.'}
          </p>
        </div>
        <MailCheck className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div
        className={cn(
          'mt-4 rounded-md border px-3 py-3 text-sm',
          isLiveMode
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800',
        )}
      >
        {emailSendingStatus?.message || 'Mock sending mode active. No real emails are sent.'}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoTile label="Mode" value={emailSendingStatus?.mode || 'mock'} />
        <InfoTile label="Approved drafts" value={approvedDrafts.length} />
        <InfoTile label="Sent emails" value={sentEmails.length} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="email-send-account">
            Sending account
          </label>
          <select
            className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="email-send-account"
            value={selectedEmailAccountId}
            onChange={(event) => onAccountChange(event.target.value)}
          >
            <option value="">Select an active account</option>
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountName || account.emailAddress} - {account.sentToday || 0}/
                {account.dailySendLimit} today
                {isLiveMode && account.provider === 'gmail'
                  ? ` - Gmail ${account.gmailTokenStatus || 'disconnected'}`
                  : ''}
              </option>
            ))}
          </select>
          {liveBlockedReason ? (
            <p className="mt-2 text-sm text-red-700">{liveBlockedReason}</p>
          ) : null}
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onSendCampaign}
          disabled={!canSend || !approvedDrafts.length || isEmailSending}
        >
          {isEmailSending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send All Approved
        </button>
      </div>

      <ApprovedDraftSendTable
        approvedDrafts={approvedDrafts}
        canSend={canSend}
        isEmailSending={isEmailSending}
        sendMode={emailSendingStatus?.mode || 'mock'}
        onSendDraft={onSendDraft}
      />

      <SentEmailsTable sentEmails={sentEmails} />
    </div>
  )
}

function ApprovedDraftSendTable({
  approvedDrafts,
  canSend,
  isEmailSending,
  onSendDraft,
  sendMode,
}) {
  if (!approvedDrafts.length) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No approved drafts are ready for sending.
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Approved Draft</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {approvedDrafts.map((draft) => (
              <tr key={draft.id} className="align-top">
                <td className="min-w-56 px-4 py-3 text-slate-700">{draft.subject}</td>
                <td className="min-w-52 px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {draft.lead?.name || draft.lead?.email || 'Unnamed lead'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{draft.lead?.email || 'No email'}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {draft.draftType}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => onSendDraft(draft.id)}
                    disabled={!canSend || isEmailSending}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {sendMode === 'live' ? 'Send Live' : 'Send Mock'}
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

function SentEmailsTable({ sentEmails }) {
  if (!sentEmails.length) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        No sent emails yet.
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Message ID</th>
              <th className="px-4 py-3">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {sentEmails.map((email) => (
              <tr key={email.id} className="align-top">
                <td className="min-w-52 px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {email.lead?.name || email.toEmail || 'Unnamed lead'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{email.lead?.email || email.toEmail}</p>
                </td>
                <td className="min-w-56 px-4 py-3 text-slate-700">{email.subject}</td>
                <td className="min-w-48 px-4 py-3 text-slate-700">
                  {email.emailAccount?.emailAddress || email.fromEmail || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SyncBadge status={email.status} />
                </td>
                <td className="min-w-72 px-4 py-3 text-slate-700">{email.messageId || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(email.sentAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

function SyncBadge({ status }) {
  const variants = {
    failed: 'destructive',
    pending: 'warning',
    synced: 'success',
  }

  return <Badge variant={variants[status] || 'secondary'}>{status || 'pending'}</Badge>
}

function DraftStatusBadge({ status }) {
  const variants = {
    approved: 'success',
    draft: 'warning',
    rejected: 'destructive',
    saved: 'secondary',
    sent: 'success',
  }

  return <Badge variant={variants[status] || 'secondary'}>{status || 'draft'}</Badge>
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
