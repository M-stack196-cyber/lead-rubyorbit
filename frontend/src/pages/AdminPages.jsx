import { createElement, useCallback, useEffect, useState } from 'react'
import { AlertTriangle, FileClock, Loader2, PlayCircle, RefreshCcw, Settings2, ShieldCheck, UserRoundCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createTeamMember,
  deleteTeamMember,
  getAuditLogs,
  getAutomationStatus,
  getEmailAccounts,
  getEmailSendingStatus,
  getGmailStatus,
  getTeamMembers,
  getWorkflowSettings,
  runAutomationNow,
  updateTeamMember,
  updateWorkflowSettings,
} from '@/services/api'

const defaultWorkflowForm = {
  replyCheckIntervalValue: 5,
  replyCheckIntervalUnit: 'minutes',
  replyWaitingTimeValue: 2,
  replyWaitingTimeUnit: 'days',
  noReplyTimeoutDays: 3,
  automationCampaignBatchSize: 25,
  createFollowupDrafts: false,
  followupDraftBatchSize: 25,
}

const defaultTeamMemberForm = {
  id: '',
  fullName: '',
  email: '',
  role: 'operator',
  status: 'active',
  authUserId: '',
}

export function WorkflowSettingsPage() {
  const [sendStatus, setSendStatus] = useState(null)
  const [gmailStatus, setGmailStatus] = useState(null)
  const [automationStatus, setAutomationStatus] = useState(null)
  const [workflowSettings, setWorkflowSettings] = useState(null)
  const [workflowForm, setWorkflowForm] = useState(defaultWorkflowForm)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRunningAutomation, setIsRunningAutomation] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [sendData, gmailData, automationData, workflowData, accountsData] = await Promise.all([
        getEmailSendingStatus(),
        getGmailStatus(),
        getAutomationStatus(),
        getWorkflowSettings(),
        getEmailAccounts(),
      ])
      setSendStatus(sendData)
      setGmailStatus(gmailData)
      setAutomationStatus(automationData)
      setWorkflowSettings(workflowData)
      setWorkflowForm({
        replyCheckIntervalValue: workflowData.replyCheckIntervalValue || 5,
        replyCheckIntervalUnit: workflowData.replyCheckIntervalUnit || 'minutes',
        replyWaitingTimeValue: workflowData.replyWaitingTimeValue || 2,
        replyWaitingTimeUnit: workflowData.replyWaitingTimeUnit || 'days',
        noReplyTimeoutDays: workflowData.noReplyTimeoutDays || 3,
        automationCampaignBatchSize: workflowData.automationCampaignBatchSize || 25,
        createFollowupDrafts: Boolean(workflowData.createFollowupDrafts),
        followupDraftBatchSize: workflowData.followupDraftBatchSize || 25,
      })
      setEmailAccounts(accountsData)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  async function handleRunAutomation() {
    setIsRunningAutomation(true)
    setError('')
    setSuccess('')

    try {
      const result = await runAutomationNow({
        noReplyTimeoutDays: Number(workflowForm.noReplyTimeoutDays),
        campaignBatchSize: Number(workflowForm.automationCampaignBatchSize),
        createFollowupDrafts: Boolean(workflowForm.createFollowupDrafts),
        followupDraftBatchSize: Number(workflowForm.followupDraftBatchSize),
      })
      setSuccess(
        result.skipped
          ? 'Automation skipped because another run is already active.'
          : `Automation completed across ${result.workspacesProcessed || 0} workspace(s).`,
      )
      await loadSettings()
    } catch (runError) {
      setError(runError.message)
    } finally {
      setIsRunningAutomation(false)
    }
  }

  async function handleSaveWorkflowSettings(event) {
    event.preventDefault()
    setIsRunningAutomation(true)
    setError('')
    setSuccess('')

    try {
      const saved = await updateWorkflowSettings({
        ...workflowForm,
        replyCheckIntervalValue: Number(workflowForm.replyCheckIntervalValue),
        replyWaitingTimeValue: Number(workflowForm.replyWaitingTimeValue),
        noReplyTimeoutDays: Number(workflowForm.noReplyTimeoutDays),
        automationCampaignBatchSize: Number(workflowForm.automationCampaignBatchSize),
        followupDraftBatchSize: Number(workflowForm.followupDraftBatchSize),
      })
      setWorkflowSettings(saved)
      setSuccess('Workflow timing settings saved.')
      await loadSettings()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsRunningAutomation(false)
    }
  }

  const connectedAccounts = emailAccounts.filter(
    (account) => account.gmailTokenStatus === 'connected',
  )
  const readinessIssues = [
    sendStatus?.realSendingEnabled
      ? null
      : connectedAccounts.length
        ? 'Gmail account connected, but live sending is disabled because EMAIL_SEND_MODE=mock.'
        : 'Live sending is disabled; EMAIL_SEND_MODE remains safe.',
    connectedAccounts.length ? null : 'No connected Gmail account is ready.',
    emailAccounts.some((account) => account.isEnabled) ? null : 'No enabled sender account found.',
  ].filter(Boolean)

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">Operations</Badge>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
            <Settings2 className="h-7 w-7 text-slate-500" aria-hidden="true" />
            Workflow Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Production readiness, sender limits, Gmail OAuth health, and automation controls.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={handleRunAutomation}
            disabled={isLoading || isRunningAutomation}
          >
            {isRunningAutomation ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Run Automation Check
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <ReadinessTile
          icon={sendStatus?.realSendingEnabled ? ShieldCheck : AlertTriangle}
          label="Email Sending"
          status={sendStatus?.mode || 'loading'}
          tone={sendStatus?.realSendingEnabled ? 'success' : 'warning'}
          value={sendStatus?.message || 'Checking email send mode.'}
        />
        <ReadinessTile
          icon={connectedAccounts.length ? ShieldCheck : AlertTriangle}
          label="Gmail OAuth"
          status={`${connectedAccounts.length} connected`}
          tone={connectedAccounts.length ? 'success' : 'warning'}
          value={gmailStatus?.message || 'Checking Gmail OAuth status.'}
        />
        <ReadinessTile
          icon={automationStatus?.config?.enabled ? ShieldCheck : AlertTriangle}
          label="Automation"
          status={automationStatus?.config?.enabled ? 'enabled' : 'manual'}
          tone={automationStatus?.config?.enabled ? 'success' : 'warning'}
          value={automationStatus?.safety?.message || 'Checking automation state.'}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <WorkflowTimingCard
          form={workflowForm}
          isSaving={isRunningAutomation}
          settings={workflowSettings}
          onChange={setWorkflowForm}
          onSubmit={handleSaveWorkflowSettings}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Live Send Readiness</CardTitle>
            <CardDescription>Current blockers before production live sending.</CardDescription>
          </CardHeader>
          <CardContent>
            {readinessIssues.length ? (
              <ul className="grid gap-2">
                {readinessIssues.map((issue) => (
                  <li className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" key={issue}>
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Core readiness checks passed. Final production review is still required before enabling live sending.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Sender Limits And OAuth</CardTitle>
            <CardDescription>Enabled state, daily caps, usage, and Gmail token health.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailAccountReadinessTable accounts={emailAccounts} />
          </CardContent>
        </Card>
      </section>
    </>
  )
}

function WorkflowTimingCard({ form, isSaving, settings, onChange, onSubmit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-950">Automation Timing</CardTitle>
        <CardDescription>Workspace defaults for reply checks and no-reply review.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Reply check interval"
              max={1440}
              min={1}
              value={form.replyCheckIntervalValue}
              onChange={(value) => onChange({ ...form, replyCheckIntervalValue: value })}
            />
            <UnitSelect
              label="Interval unit"
              value={form.replyCheckIntervalUnit}
              onChange={(value) => onChange({ ...form, replyCheckIntervalUnit: value })}
            />
            <NumberField
              label="Reply waiting time"
              max={30}
              min={1}
              value={form.replyWaitingTimeValue}
              onChange={(value) => onChange({ ...form, replyWaitingTimeValue: value })}
            />
            <UnitSelect
              label="Waiting unit"
              value={form.replyWaitingTimeUnit}
              onChange={(value) => onChange({ ...form, replyWaitingTimeUnit: value })}
            />
            <NumberField
              label="No-reply timeout days"
              max={30}
              min={1}
              value={form.noReplyTimeoutDays}
              onChange={(value) => onChange({ ...form, noReplyTimeoutDays: value })}
            />
            <NumberField
              label="Campaign batch size"
              max={100}
              min={1}
              value={form.automationCampaignBatchSize}
              onChange={(value) => onChange({ ...form, automationCampaignBatchSize: value })}
            />
            <NumberField
              label="Follow-up draft batch"
              max={100}
              min={1}
              value={form.followupDraftBatchSize}
              onChange={(value) => onChange({ ...form, followupDraftBatchSize: value })}
            />
            <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                type="checkbox"
                checked={form.createFollowupDrafts}
                onChange={(event) => onChange({ ...form, createFollowupDrafts: event.target.checked })}
              />
              Create follow-up drafts during automation
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Last saved: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'not saved'}
            </p>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              )}
              Save Timing
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function NumberField({ label, max, min, value, onChange }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        max={max}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function UnitSelect({ label, value, onChange }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {['seconds', 'minutes', 'hours', 'days'].map((unit) => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
    </label>
  )
}

export function TeamMembersPage() {
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(defaultTeamMemberForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setMembers(await getTeamMembers())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        status: form.status,
        authUserId: form.authUserId,
      }

      if (form.id) {
        await updateTeamMember(form.id, payload)
        setSuccess('Team member updated.')
      } else {
        await createTeamMember(payload)
        setSuccess('Team member created.')
      }

      setForm(defaultTeamMemberForm)
      await loadMembers()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDisable(memberId) {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await deleteTeamMember(memberId)
      setSuccess('Team member disabled.')
      await loadMembers()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <header className="border-b border-slate-200 pb-6">
        <Badge variant="outline" className="mb-3 bg-white">Access Control</Badge>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
          <UserRoundCog className="h-7 w-7 text-slate-500" aria-hidden="true" />
          Team Members
        </h1>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">
              {form.id ? 'Edit Member' : 'Add Member'}
            </CardTitle>
            <CardDescription>Roles map to workspace permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <TextField
                label="Full name"
                value={form.fullName}
                onChange={(value) => setForm({ ...form, fullName: value })}
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
              <TextField
                label="Auth user ID"
                value={form.authUserId}
                onChange={(value) => setForm({ ...form, authUserId: value })}
              />
              <SelectField
                label="Role"
                options={['admin', 'manager', 'operator', 'viewer']}
                value={form.role}
                onChange={(value) => setForm({ ...form, role: value })}
              />
              <SelectField
                label="Status"
                options={['active', 'disabled']}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value })}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <UserRoundCog className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  type="button"
                  onClick={() => setForm(defaultTeamMemberForm)}
                >
                  Clear
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Members</CardTitle>
            <CardDescription>{members.length} workspace member(s).</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersTable
              isLoading={isLoading}
              members={members}
              onDisable={handleDisable}
              onEdit={setForm}
            />
          </CardContent>
        </Card>
      </section>
    </>
  )
}

function TeamMembersTable({ isLoading, members, onDisable, onEdit }) {
  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading team members...</p>
  }

  if (!members.length) {
    return <p className="text-sm text-slate-500">No team members yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {members.map((member) => (
              <tr key={member.id} className="align-top">
                <td className="min-w-44 px-4 py-3 font-medium text-slate-950">
                  {member.fullName || '-'}
                </td>
                <td className="min-w-56 px-4 py-3 text-slate-700">{member.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{member.role}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{member.status}</td>
                <td className="min-w-48 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      type="button"
                      onClick={() => onEdit({
                        id: member.id,
                        fullName: member.fullName || '',
                        email: member.email || '',
                        role: member.role || 'operator',
                        status: member.status || 'active',
                        authUserId: member.authUserId || '',
                      })}
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() => onDisable(member.id)}
                      disabled={member.status === 'disabled'}
                    >
                      Disable
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

function TextField({ label, type = 'text', value, onChange }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SelectField({ label, options, value, onChange }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({ action: '', entityType: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const rows = await getAuditLogs({
        action: filters.action,
        entityType: filters.entityType,
        limit: 100,
      })
      setLogs(rows)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters.action, filters.entityType])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <>
      <header className="border-b border-slate-200 pb-6">
        <Badge variant="outline" className="mb-3 bg-white">Security</Badge>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
          <FileClock className="h-7 w-7 text-slate-500" aria-hidden="true" />
          Audit Logs
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">Workspace Activity</CardTitle>
          <CardDescription>Recent protected actions recorded by the backend.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Filter by action"
              value={filters.action}
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
            />
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Filter by entity type"
              value={filters.entityType}
              onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
            />
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={loadLogs}
            >
              Refresh
            </button>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading audit logs...</p>
          ) : (
            <AuditLogTable logs={logs} />
          )}
        </CardContent>
      </Card>
    </>
  )
}

function AuditLogTable({ logs }) {
  if (!logs.length) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No audit logs found.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(log.createdAt)}</td>
              <td className="px-4 py-3 text-slate-700">{log.actorName || log.actorEmail || 'System'}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
              <td className="px-4 py-3 text-slate-600">
                {log.entityType || 'n/a'}
                {log.entityId ? <span className="block truncate text-xs text-slate-400">{log.entityId}</span> : null}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {log.metadata?.result || 'recorded'}
                {log.metadata?.statusCode ? (
                  <span className="block text-xs text-slate-400">HTTP {log.metadata.statusCode}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReadinessTile({ icon, label, status, tone, value }) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base text-slate-950">{label}</CardTitle>
          <CardDescription>{value}</CardDescription>
        </div>
        {createElement(icon, { className: 'h-5 w-5 text-slate-500', 'aria-hidden': true })}
      </CardHeader>
      <CardContent>
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${toneClasses}`}>
          {status}
        </span>
      </CardContent>
    </Card>
  )
}

function EmailAccountReadinessTable({ accounts }) {
  if (!accounts.length) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No sender accounts configured.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Daily limit</th>
              <th className="px-4 py-3">Sent today</th>
              <th className="px-4 py-3">Gmail token</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="min-w-56 px-4 py-3">
                  <p className="font-medium text-slate-900">{account.emailAddress}</p>
                  <p className="mt-1 text-xs text-slate-500">{account.provider}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {account.isEnabled ? 'Yes' : 'No'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {account.dailySendLimit || 0}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {account.sentToday || 0}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {account.gmailTokenStatus || 'n/a'}
                  {account.gmailLastError ? (
                    <span className="block max-w-64 truncate text-xs text-red-600">
                      {account.gmailLastError}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function StaticAdminPage({ badge, icon: Icon, items, title }) {
  return (
    <>
      <header className="border-b border-slate-200 pb-6">
        <Badge variant="outline" className="mb-3 bg-white">{badge}</Badge>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-normal text-slate-950">
          {createElement(Icon, { className: 'h-7 w-7 text-slate-500', 'aria-hidden': true })}
          {title}
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-950">{title}</CardTitle>
          <CardDescription>Production controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(([label, value]) => (
              <div className="rounded-md border border-slate-200 bg-white p-4" key={label}>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
                <p className="mt-2 text-sm text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
