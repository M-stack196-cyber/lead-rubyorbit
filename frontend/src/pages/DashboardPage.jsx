import { useEffect, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  MailQuestion,
  MessageCircle,
  Send,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBackendHealth } from '@/services/api'

const metricCards = [
  { label: 'Total Leads', value: '0', icon: Users },
  { label: 'Active Campaigns', value: '0', icon: Send },
  { label: 'Pending Approvals', value: '0', icon: ClipboardCheck },
  { label: 'Replies', value: '0', icon: MessageCircle },
  { label: 'No-Reply Leads', value: '0', icon: MailQuestion },
  { label: 'Pending Decisions', value: '0', icon: CircleDashed },
]

export function DashboardPage() {
  const [health, setHealth] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let isMounted = true

    getBackendHealth()
      .then((data) => {
        if (isMounted) {
          setHealth({ status: 'online', data, error: null })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setHealth({ status: 'offline', data: null, error: error.message })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const isOnline = health.status === 'online'
  const isLoading = health.status === 'loading'

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 bg-white">
            Phase 0 Foundation
          </Badge>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            LeadRubyOrbit Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Base project shell for lead outreach operations, approvals, replies, and team workflow
            visibility.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          Operational workspace
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-slate-600">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-950">{metric.value}</div>
              <p className="mt-2 text-sm text-slate-500">Ready for later phase data.</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base text-slate-950">Backend Connection Status</CardTitle>
              <CardDescription>
                Health check powered by the Phase 0 Express API.
              </CardDescription>
            </div>
            <Badge variant={isOnline ? 'success' : isLoading ? 'warning' : 'secondary'}>
              {isOnline ? 'Online' : isLoading ? 'Checking' : 'Unavailable'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <StatusRow label="Status" value={health.data?.status || health.status} />
              <StatusRow label="Service" value={health.data?.service || 'Waiting for API'} />
              <StatusRow label="Project" value={health.data?.project || 'LeadRubyOrbit'} />
            </div>
            {health.error ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {health.error}
              </p>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                API service contract is ready for Phase 0.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}

function StatusRow({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
    </div>
  )
}
