import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Loader2, Mail, MessageSquareReply, PenLine, RefreshCcw, Save, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  cancelTeamDecision,
  completeTeamDecision,
  createEmailDraft,
  createFollowupDraftFromNoReply,
  generateAiFollowupDraftFromNoReply,
  generateAiReplyDraft,
  getCampaignLeads,
  getCampaigns,
  getEmailDrafts,
  getFollowupDrafts,
  getReplyDrafts,
  getTeamDecisions,
  getTeamMembers,
} from '@/services/api'
import { RecordsPage } from './LeadsPage'

export function EmailDraftsPage() {
  return (
    <RecordsPage
      badge="Draft Queue"
      columns={[
        ['subject', 'Subject'],
        ['draftType', 'Type'],
        ['status', 'Status'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={Mail}
      loader={getEmailDrafts}
      title="Email Drafts"
    />
  )
}

export function RepliesPage() {
  return (
    <RecordsPage
      badge="Reply Queue"
      columns={[
        ['subject', 'Subject'],
        ['status', 'Status'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={MessageSquareReply}
      loader={getReplyDrafts}
      title="Replies"
    />
  )
}

export function FollowUpsPage() {
  return (
    <RecordsPage
      badge="Follow-up Queue"
      columns={[
        ['subject', 'Subject'],
        ['status', 'Status'],
        ['followupNumber', 'Number'],
        ['leadName', 'Lead'],
        ['updatedAt', 'Updated'],
      ]}
      icon={RefreshCcw}
      loader={getFollowupDrafts}
      title="Follow-ups"
    />
  )
}

export function ManualComposePage() {
  const [campaigns, setCampaigns] = useState([])
  const [campaignLeads, setCampaignLeads] = useState([])
  const [form, setForm] = useState({
    campaignId: '',
    campaignLeadId: '',
    subject: '',
    body: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setCampaigns(await getCampaigns())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    let isMounted = true

    async function loadCampaignLeadOptions() {
      if (!form.campaignId) {
        setCampaignLeads([])
        return
      }

      try {
        const rows = await getCampaignLeads(form.campaignId)
        if (isMounted) setCampaignLeads(rows)
      } catch (loadError) {
        if (isMounted) setError(loadError.message)
      }
    }

    loadCampaignLeadOptions()

    return () => {
      isMounted = false
    }
  }, [form.campaignId])

  async function handleSubmit(event) {
    event.preventDefault()
    const selectedCampaignLead = campaignLeads.find((row) => row.id === form.campaignLeadId)

    if (!selectedCampaignLead) {
      setError('Select a campaign lead before saving the draft.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await createEmailDraft({
        campaignId: form.campaignId,
        campaignLeadId: selectedCampaignLead.id,
        leadId: selectedCampaignLead.leadId,
        draftType: 'manual',
        subject: form.subject,
        body: form.body,
      })
      setSuccess('Manual draft saved. No email was sent.')
      setForm((current) => ({ ...current, campaignLeadId: '', subject: '', body: '' }))
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">Manual Draft</Badge>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
            <PenLine className="h-7 w-7 text-slate-500" aria-hidden="true" />
            Manual Compose
          </h1>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={loadCampaigns}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </button>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Create Draft</CardTitle>
          <CardDescription>Drafts are saved only and stay out of live sending.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Campaign
              <select
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={form.campaignId}
                onChange={(event) => setForm({ ...form, campaignId: event.target.value, campaignLeadId: '' })}
                required
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Campaign Lead
              <select
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={form.campaignLeadId}
                onChange={(event) => setForm({ ...form, campaignLeadId: event.target.value })}
                required
                disabled={!form.campaignId}
              >
                <option value="">Select lead</option>
                {campaignLeads.map((campaignLead) => (
                  <option key={campaignLead.id} value={campaignLead.id}>
                    {campaignLead.lead?.name || campaignLead.lead?.email || campaignLead.leadId}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Subject
              <input
                className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Body
              <textarea
                className="min-h-44 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                required
              />
            </label>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Save Draft
            </button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

export function TeamDecisionsPage() {
  const [rows, setRows] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [assignees, setAssignees] = useState({})
  const [activeId, setActiveId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [decisionRows, memberRows] = await Promise.all([
        getTeamDecisions(),
        getTeamMembers().catch(() => []),
      ])
      setRows(decisionRows)
      setTeamMembers(memberRows)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  async function runDecisionAction(row, action) {
    setActiveId(row.id)
    setError('')
    setSuccess('')

    try {
      if (action === 'ai_reply') {
        if (!row.replyId) throw new Error('This decision is not linked to a reply.')
        await generateAiReplyDraft({ replyId: row.replyId })
        await completeTeamDecision(row.id, { decisionType: 'manual_handling' })
        setSuccess('AI reply draft created for approval. No email was sent.')
      } else if (action === 'manual_followup') {
        if (!row.sentEmailId) throw new Error('This decision is not linked to a sent email.')
        await createFollowupDraftFromNoReply(row.sentEmailId, { sourceTeamDecisionId: row.id })
        await completeTeamDecision(row.id, { decisionType: 'continue_later' })
        setSuccess('Follow-up draft saved. No email was sent.')
      } else if (action === 'ai_followup') {
        if (!row.sentEmailId) throw new Error('This decision is not linked to a sent email.')
        await generateAiFollowupDraftFromNoReply(row.sentEmailId, { sourceTeamDecisionId: row.id })
        await completeTeamDecision(row.id, { decisionType: 'continue_later' })
        setSuccess('AI follow-up draft created for approval. No email was sent.')
      } else if (action === 'cancel') {
        await cancelTeamDecision(row.id)
        setSuccess('Team decision cancelled.')
      } else {
        const assignedTo = action === 'assign_to_team_member' ? assignees[row.id] : ''
        await completeTeamDecision(row.id, { decisionType: action, assignedTo })
        setSuccess(action === 'create_reply_draft' ? 'Reply draft saved. No email was sent.' : 'Team decision completed.')
      }

      await loadRows()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setActiveId('')
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">Decision Queue</Badge>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
            <ClipboardCheck className="h-7 w-7 text-slate-500" aria-hidden="true" />
            Team Decisions
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

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Team Decisions</CardTitle>
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
                      <th className="px-4 py-3">Decision</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="min-w-44 px-4 py-3 text-slate-700">{formatQueueValue(row.decisionType)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatQueueValue(row.status)}</td>
                        <td className="min-w-52 px-4 py-3 text-slate-700">{formatQueueValue(row.reason)}</td>
                        <td className="min-w-44 px-4 py-3 text-slate-700">{formatQueueValue(row.leadName)}</td>
                        <td className="min-w-96 px-4 py-3">
                          {row.status === 'pending' ? (
                            <div className="flex flex-wrap gap-2">
                              <ActionButton active={activeId === row.id} icon={PenLine} label="Reply" onClick={() => runDecisionAction(row, 'create_reply_draft')} />
                              <ActionButton active={activeId === row.id} icon={Sparkles} label="AI Reply" onClick={() => runDecisionAction(row, 'ai_reply')} />
                              <ActionButton active={activeId === row.id} icon={PenLine} label="Follow-up" onClick={() => runDecisionAction(row, 'manual_followup')} />
                              <ActionButton active={activeId === row.id} icon={Sparkles} label="AI Follow-up" onClick={() => runDecisionAction(row, 'ai_followup')} />
                              <ActionButton active={activeId === row.id} label="Interested" onClick={() => runDecisionAction(row, 'interested')} />
                              <ActionButton active={activeId === row.id} label="Not Interested" onClick={() => runDecisionAction(row, 'not_interested')} />
                              <select
                                className="min-h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                                value={assignees[row.id] || ''}
                                onChange={(event) => setAssignees({ ...assignees, [row.id]: event.target.value })}
                              >
                                <option value="">Assign member</option>
                                {teamMembers.map((member) => (
                                  <option key={member.id} value={member.id}>{member.fullName || member.email}</option>
                                ))}
                              </select>
                              <ActionButton active={activeId === row.id} label="Assign" onClick={() => runDecisionAction(row, 'assign_to_team_member')} />
                              <ActionButton active={activeId === row.id} label="Pause" onClick={() => runDecisionAction(row, 'manual_handling')} />
                              <ActionButton active={activeId === row.id} label="Stop" onClick={() => runDecisionAction(row, 'stop_outreach')} />
                              <ActionButton active={activeId === row.id} label="Continue Later" onClick={() => runDecisionAction(row, 'continue_later')} />
                              <ActionButton active={activeId === row.id} label="Complete" onClick={() => runDecisionAction(row, row.decisionType || 'manual_handling')} />
                              <ActionButton active={activeId === row.id} label="Cancel" onClick={() => runDecisionAction(row, 'cancel')} />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">No pending action</span>
                          )}
                        </td>
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

function ActionButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={onClick}
      disabled={active}
    >
      {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </button>
  )
}

function formatQueueValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value).replaceAll('_', ' ')
}
