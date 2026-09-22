import { createElement, useCallback, useEffect, useState } from 'react'
import { Archive, Bell, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  archiveNotification,
  getNotificationSummary,
  getNotifications,
  markNotificationRead,
  resolveNotification,
} from '@/services/api'

const notificationTypes = [
  'new_reply',
  'no_reply_detected',
  'team_decision_pending',
  'reply_draft_pending_approval',
  'followup_draft_created',
  'followup_required',
  'draft_approved',
  'system_info',
]

const priorities = ['low', 'normal', 'high', 'urgent']
const statuses = ['unread', 'read', 'resolved', 'archived']

const defaultFilters = {
  status: '',
  type: '',
  priority: '',
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState('')
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [summaryData, rows] = await Promise.all([
        getNotificationSummary(),
        getNotifications({ ...filters, limit: 100 }),
      ])
      setSummary(summaryData)
      setNotifications(rows)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function handleAction(notificationId, action) {
    setActiveId(notificationId)
    setError('')

    try {
      if (action === 'read') await markNotificationRead(notificationId)
      if (action === 'resolve') await resolveNotification(notificationId)
      if (action === 'archive') await archiveNotification(notificationId)
      await loadNotifications()
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
          <Badge variant="outline" className="mb-3 bg-white">
            Workflow Alerts
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Notifications</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review replies, approvals, decisions, and follow-up work that needs team attention.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={loadNotifications}
          disabled={isLoading}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryTile label="Unread" value={summary?.unread || 0} />
        <SummaryTile label="High Priority" value={summary?.highPriority || 0} />
        <SummaryTile label="Urgent" value={summary?.urgent || 0} />
        <SummaryTile label="Team Decisions" value={summary?.pendingTeamDecision || 0} />
        <SummaryTile label="Draft Approvals" value={summary?.replyDraftPendingApproval || 0} />
        <SummaryTile label="Follow-up Required" value={summary?.followupRequired || 0} />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base text-slate-950">Notification Queue</CardTitle>
            <CardDescription>{notifications.length} notification(s) in view.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <FilterSelect
              label="Status"
              value={filters.status}
              options={statuses}
              onChange={(status) => setFilters((current) => ({ ...current, status }))}
            />
            <FilterSelect
              label="Type"
              value={filters.type}
              options={notificationTypes}
              onChange={(type) => setFilters((current) => ({ ...current, type }))}
            />
            <FilterSelect
              label="Priority"
              value={filters.priority}
              options={priorities}
              onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Loading notifications
            </div>
          ) : notifications.length ? (
            <NotificationsTable
              activeId={activeId}
              notifications={notifications}
              onAction={handleAction}
            />
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No notifications match the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <select
        className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function NotificationsTable({ activeId, notifications, onAction }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Notification</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Campaign / Lead</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {notifications.map((notification) => (
              <tr key={notification.id} className="align-top">
                <td className="min-w-72 px-4 py-3">
                  <p className="font-medium text-slate-950">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {notification.message}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatLabel(notification.type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Pill value={notification.priority} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Pill value={notification.status} />
                </td>
                <td className="min-w-56 px-4 py-3 text-slate-700">
                  <p>{notification.campaign?.name || '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {notification.lead?.name || notification.lead?.email || '-'}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(notification.createdAt)}
                </td>
                <td className="min-w-52 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      icon={CheckCircle2}
                      label="Read"
                      disabled={activeId === notification.id || notification.status !== 'unread'}
                      onClick={() => onAction(notification.id, 'read')}
                    />
                    <ActionButton
                      icon={Bell}
                      label="Resolve"
                      disabled={activeId === notification.id || notification.status === 'resolved'}
                      onClick={() => onAction(notification.id, 'resolve')}
                    />
                    <ActionButton
                      icon={Archive}
                      label="Archive"
                      disabled={activeId === notification.id || notification.status === 'archived'}
                      onClick={() => onAction(notification.id, 'archive')}
                    />
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

function ActionButton({ disabled, icon, label, onClick }) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {createElement(icon, { className: 'h-3.5 w-3.5', 'aria-hidden': true })}
      {label}
    </button>
  )
}

function Pill({ value }) {
  return (
    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
      {formatLabel(value)}
    </span>
  )
}

function formatLabel(value) {
  return String(value || '-').replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
