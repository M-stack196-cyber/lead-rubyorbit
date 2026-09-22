import { createElement, useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  CircleDashed,
  ClipboardCheck,
  Loader2,
  MailQuestion,
  MessageCircle,
  RefreshCcw,
  Send,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardSummary } from '@/services/api'

const metricCards = [
  { key: 'totalLeads', label: 'Total Leads', icon: Users },
  { key: 'activeCampaigns', label: 'Active Campaigns', icon: Send },
  { key: 'pendingApprovalDrafts', label: 'Pending Approvals', icon: ClipboardCheck },
  { key: 'replies', label: 'Replies', icon: MessageCircle },
  { key: 'noReplyEmails', label: 'No-Reply Emails', icon: MailQuestion },
  { key: 'pendingTeamDecisions', label: 'Pending Decisions', icon: CircleDashed },
  { key: 'unreadNotifications', label: 'Unread Notifications', icon: Bell },
  { key: 'connectedEmailAccounts', label: 'Connected Accounts', icon: Activity },
]

export function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  async function loadDashboardSummary() {
    setStatus('loading')
    setError('')

    try {
      const data = await getDashboardSummary()
      setSummary(data)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    loadDashboardSummary()
  }, [])

  const counts = summary?.counts || {}

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Phase 17 Visibility
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            LeadRubyOrbit Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Campaign activity, lead state, notifications, and pending team work in one place.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={loadDashboardSummary}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          )}
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            icon={metric.icon}
            key={metric.key}
            label={metric.label}
            value={counts[metric.key] || 0}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Campaign Overview</CardTitle>
            <CardDescription>
              {counts.totalCampaigns || 0} campaign(s) in the workspace. Select a row to open campaign detail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignOverviewTable campaigns={summary?.recentCampaigns || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Pending Actions</CardTitle>
            <CardDescription>Manual work waiting for team attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <InfoTile label="Team decisions" value={summary?.pendingActions?.pendingTeamDecisions || 0} />
              <InfoTile label="Draft approvals" value={summary?.pendingActions?.pendingApprovalDrafts || 0} />
              <InfoTile label="Follow-up required" value={summary?.pendingActions?.followupRequiredLeads || 0} />
              <InfoTile label="Unread notifications" value={summary?.pendingActions?.unreadNotifications || 0} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Recent Activity</CardTitle>
            <CardDescription>Latest replies, sends, and notifications.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityList items={summary?.recentActivity || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-950">Notification Summary</CardTitle>
            <CardDescription>{counts.unreadNotifications || 0} unread notification(s).</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityList items={summary?.notificationSummary?.recent || []} />
          </CardContent>
        </Card>
      </section>
    </>
  )
}

function MetricCard({ icon, label, value }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-slate-600">{label}</CardTitle>
        {createElement(icon, { className: 'h-4 w-4 text-slate-500', 'aria-hidden': true })}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  )
}

function CampaignOverviewTable({ campaigns }) {
  if (!campaigns.length) {
    return <EmptyState text="No campaigns yet. Create one from Campaigns to begin tracking workflow activity." />
  }

  function openCampaign(campaignId) {
    window.sessionStorage.setItem('leadRubyOrbit:selectedCampaignId', campaignId)
    window.location.hash = 'campaigns'
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="cursor-pointer align-top transition hover:bg-slate-50"
                onClick={() => openCampaign(campaign.id)}
              >
                <td className="min-w-56 px-4 py-3">
                  <p className="font-medium text-slate-950">{campaign.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {campaign.description || 'No description'}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  <StatusPill value={campaign.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {formatDate(campaign.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActivityList({ items }) {
  if (!items.length) {
    return <EmptyState text="No activity yet. As campaigns move through drafts, replies, no-replies, and notifications, events will appear here." />
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 10).map((item) => (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={item.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-950">{item.title}</p>
                <StatusPill value={formatLabel(item.type)} />
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-600">{item.description}</p>
              {item.campaignName || item.leadName ? (
                <p className="mt-1 text-xs text-slate-500">
                  {[item.campaignName, item.leadName].filter(Boolean).join(' / ')}
                </p>
              ) : null}
            </div>
            <span className="whitespace-nowrap text-xs text-slate-500">
              {formatDate(item.occurredAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
    </div>
  )
}

function StatusPill({ value }) {
  return (
    <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
      {value || '-'}
    </span>
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

function formatLabel(value) {
  return String(value || '-').replaceAll('_', ' ')
}
