import { createElement, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  MailCheck,
  Plug,
  RefreshCcw,
  Save,
  ShieldOff,
  Archive,
  Unplug,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  archiveEmailAccount,
  createEmailAccount,
  disconnectGmailAccount,
  disableEmailAccount,
  enableEmailAccount,
  getEmailAccountById,
  getEmailAccounts,
  getGmailConnectUrl,
  getGmailStatus,
  updateEmailAccount,
} from '@/services/api'

const defaultForm = {
  id: '',
  provider: 'smtp',
  accountName: '',
  emailAddress: '',
  fromName: '',
  dailySendLimit: 50,
  smtpHost: '',
  smtpPort: '',
  smtpUsername: '',
  smtpSecure: false,
  smtpSecret: '',
  notes: '',
}

const statusVariants = {
  active: 'success',
  archived: 'secondary',
  disabled: 'warning',
  draft: 'outline',
  error: 'destructive',
}

const gmailStatusVariants = {
  connected: 'success',
  disconnected: 'secondary',
  error: 'destructive',
  expired: 'warning',
}

export function EmailAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [gmailStatus, setGmailStatus] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const summary = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((account) => account.status === 'active').length,
      disabled: accounts.filter((account) => account.status === 'disabled').length,
      archived: accounts.filter((account) => account.status === 'archived').length,
    }),
    [accounts],
  )

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmailResult = params.get('gmail')

    if (gmailResult === 'connected') {
      setSuccess('Gmail connected successfully.')
    } else if (gmailResult === 'error') {
      setError('Gmail OAuth connection failed. Try connecting again.')
    }
  }, [])

  async function loadAccounts() {
    setIsLoading(true)
    setError('')

    try {
      const [accountList, gmailConfig] = await Promise.all([getEmailAccounts(), getGmailStatus()])
      setAccounts(accountList)
      setGmailStatus(gmailConfig)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setForm(defaultForm)
  }

  async function editAccount(account) {
    setError('')

    try {
      const detail = await getEmailAccountById(account.id)
      setForm({
        id: detail.id,
        provider: detail.provider,
        accountName: detail.accountName || '',
        emailAddress: detail.emailAddress || '',
        fromName: detail.fromName || '',
        dailySendLimit: detail.dailySendLimit || 50,
        smtpHost: detail.smtpHost || '',
        smtpPort: detail.smtpPort || '',
        smtpUsername: detail.smtpUsername || '',
        smtpSecure: Boolean(detail.smtpSecure),
        smtpSecret: '',
        notes: detail.notes || '',
      })
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      if (form.id) {
        await updateEmailAccount(form.id, {
          accountName: form.accountName,
          fromName: form.fromName,
          dailySendLimit: Number(form.dailySendLimit),
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
          smtpUsername: form.smtpUsername,
          smtpSecure: form.smtpSecure,
          smtpSecret: form.smtpSecret,
          notes: form.notes,
        })
        setSuccess('Email account updated. No email was sent.')
      } else {
        await createEmailAccount({
          provider: form.provider,
          accountName: form.accountName,
          emailAddress: form.emailAddress,
          fromName: form.fromName,
          dailySendLimit: Number(form.dailySendLimit),
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
          smtpUsername: form.smtpUsername,
          smtpSecure: form.smtpSecure,
          smtpSecret: form.smtpSecret,
          notes: form.notes,
        })
        setSuccess('Email account created. Emails are not sent in this phase.')
      }

      resetForm()
      await loadAccounts()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function runAction(action, accountId, message) {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await action(accountId)
      setSuccess(message)
      await loadAccounts()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function connectGmail(accountId) {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const result = await getGmailConnectUrl(accountId)
      window.location.assign(result.authUrl)
    } catch (connectError) {
      setError(connectError.message)
      setIsSaving(false)
    }
  }

  async function disconnectGmail(accountId) {
    await runAction(disconnectGmailAccount, accountId, 'Gmail disconnected.')
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Phase 8 Email Accounts
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            Email Accounts
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Gmail accounts can be connected with Google OAuth before live sending is enabled.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          type="button"
          onClick={loadAccounts}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      <StatusMessage error={error} success={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total accounts" value={summary.total} />
        <SummaryCard label="Active accounts" value={summary.active} />
        <SummaryCard label="Disabled accounts" value={summary.disabled} />
        <SummaryCard label="Archived accounts" value={summary.archived} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <AccountForm
          form={form}
          isSaving={isSaving}
          onChange={setForm}
          onReset={resetForm}
          onSubmit={handleSubmit}
        />

        <AccountsTable
          accounts={accounts}
          gmailStatus={gmailStatus}
          isLoading={isLoading}
          isSaving={isSaving}
          onArchive={(id) => runAction(archiveEmailAccount, id, 'Email account archived.')}
          onConnectGmail={connectGmail}
          onDisconnectGmail={disconnectGmail}
          onDisable={(id) => runAction(disableEmailAccount, id, 'Email account disabled.')}
          onEdit={editAccount}
          onEnable={(id) => runAction(enableEmailAccount, id, 'Email account enabled.')}
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

function SummaryCard({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-600">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  )
}

function AccountForm({ form, isSaving, onChange, onReset, onSubmit }) {
  const isEditing = Boolean(form.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-950">
          {isEditing ? 'Edit Account' : 'Create Account'}
        </CardTitle>
        <CardDescription>Live sending supports connected Gmail or configured SMTP accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormSelect
            disabled={isEditing}
            label="Provider"
            value={form.provider}
            onChange={(value) => onChange({ ...form, provider: value })}
            options={['smtp', 'gmail', 'outlook', 'custom']}
          />
          <FormInput
            label="Account name"
            value={form.accountName}
            onChange={(value) => onChange({ ...form, accountName: value })}
            placeholder="Main outbound account"
          />
          <FormInput
            disabled={isEditing}
            label="Email address"
            value={form.emailAddress}
            onChange={(value) => onChange({ ...form, emailAddress: value })}
            placeholder="sender@example.com"
          />
          <FormInput
            label="From name"
            value={form.fromName}
            onChange={(value) => onChange({ ...form, fromName: value })}
            placeholder="LeadRubyOrbit Team"
          />
          <FormInput
            label="Daily send limit"
            type="number"
            value={form.dailySendLimit}
            onChange={(value) => onChange({ ...form, dailySendLimit: value })}
            placeholder="50"
          />
          <FormInput
            label="SMTP host"
            value={form.smtpHost}
            onChange={(value) => onChange({ ...form, smtpHost: value })}
            placeholder="smtp.example.com"
          />
          <FormInput
            label="SMTP port"
            type="number"
            value={form.smtpPort}
            onChange={(value) => onChange({ ...form, smtpPort: value })}
            placeholder="587"
          />
          <FormInput
            label="SMTP username"
            value={form.smtpUsername}
            onChange={(value) => onChange({ ...form, smtpUsername: value })}
            placeholder="sender@example.com"
          />
          <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(event) => onChange({ ...form, smtpSecure: event.target.checked })}
            />
            SMTP secure
          </label>
          <FormInput
            label={isEditing ? 'New SMTP password' : 'SMTP password'}
            value={form.smtpSecret}
            onChange={(value) => onChange({ ...form, smtpSecret: value })}
            placeholder={isEditing ? 'Leave blank to keep existing password' : 'App password or SMTP secret'}
          />
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="account-notes">
              Notes
            </label>
            <textarea
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="account-notes"
              value={form.notes}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              placeholder="Internal account notes"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {isEditing ? 'Save Changes' : 'Create Account'}
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
      </CardContent>
    </Card>
  )
}

function AccountsTable({
  accounts,
  gmailStatus,
  isLoading,
  isSaving,
  onArchive,
  onConnectGmail,
  onDisconnectGmail,
  onDisable,
  onEdit,
  onEnable,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base text-slate-950">Account List</CardTitle>
          <CardDescription>Passwords and secrets are never returned by the API.</CardDescription>
        </div>
        <MailCheck className="h-5 w-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading accounts
          </div>
        ) : accounts.length ? (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Gmail OAuth</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Enabled</th>
                    <th className="px-4 py-3">Daily limit</th>
                    <th className="px-4 py-3">Sent today</th>
                    <th className="px-4 py-3">Last used</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {accounts.map((account) => (
                    <tr key={account.id} className="align-top">
                      <td className="min-w-56 px-4 py-3">
                        <p className="font-medium text-slate-950">
                          {account.accountName || account.emailAddress}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{account.emailAddress}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {account.provider}
                      </td>
                      <td className="min-w-56 px-4 py-3">
                        {account.provider === 'gmail' ? (
                          <div className="space-y-1">
                            <StatusBadge
                              status={account.gmailTokenStatus || 'disconnected'}
                              variants={gmailStatusVariants}
                            />
                            {account.gmailEmail ? (
                              <p className="text-xs text-slate-500">{account.gmailEmail}</p>
                            ) : null}
                            <p className="text-xs text-slate-500">
                              Gmail must be connected with Google OAuth before live sending.
                            </p>
                            {!gmailStatus?.configured ? (
                              <p className="text-xs text-amber-700">Google OAuth is not configured.</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {account.isEnabled ? 'Yes' : 'No'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {account.dailySendLimit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {account.sentToday || 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(account.lastUsedAt)}
                      </td>
                      <td className="min-w-64 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            IconComponent={Edit3}
                            label="Edit"
                            onClick={() => onEdit(account)}
                          />
                          {account.provider === 'gmail' ? (
                            <>
                              <ActionButton
                                IconComponent={Plug}
                                label="Connect Gmail"
                                onClick={() => onConnectGmail(account.id)}
                                disabled={isSaving || !gmailStatus?.configured}
                              />
                              <ActionButton
                                IconComponent={Unplug}
                                label="Disconnect Gmail"
                                onClick={() => onDisconnectGmail(account.id)}
                                disabled={
                                  isSaving ||
                                  (account.gmailTokenStatus || 'disconnected') === 'disconnected'
                                }
                              />
                            </>
                          ) : null}
                          <ActionButton
                            IconComponent={CheckCircle2}
                            label="Enable"
                            onClick={() => onEnable(account.id)}
                            disabled={isSaving || account.status === 'active'}
                          />
                          <ActionButton
                            IconComponent={ShieldOff}
                            label="Disable"
                            onClick={() => onDisable(account.id)}
                            disabled={isSaving || account.status === 'disabled'}
                          />
                          <ActionButton
                            IconComponent={Archive}
                            label="Archive"
                            onClick={() => onArchive(account.id)}
                            disabled={isSaving || account.status === 'archived'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No email accounts yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionButton({ disabled = false, IconComponent, label, onClick }) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {createElement(IconComponent, { className: 'h-3.5 w-3.5', 'aria-hidden': true })}
      {label}
    </button>
  )
}

function FormInput({ disabled = false, label, onChange, placeholder, type = 'text', value }) {
  const id = `email-account-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div>
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={disabled}
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function FormSelect({ disabled = false, label, onChange, options, value }) {
  const id = `email-account-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div>
      <label className="text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={disabled}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatusBadge({ status, variants = statusVariants }) {
  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
}

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
