import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/components/auth/authContext'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmailAccountsPage } from '@/pages/EmailAccountsPage'
import { LeadUploadsPage } from '@/pages/LeadUploadsPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { WorkflowBuilderPage } from '@/pages/WorkflowBuilderPage'
import {
  EmailDraftsPage,
  FollowUpsPage,
  ManualComposePage,
  RepliesPage,
  TeamDecisionsPage,
} from '@/pages/QueuesPage'
import { AuditLogsPage, TeamMembersPage, WorkflowSettingsPage } from '@/pages/AdminPages'

const pages = {
  campaigns: CampaignsPage,
  dashboard: DashboardPage,
  drafts: EmailDraftsPage,
  'email-accounts': EmailAccountsPage,
  'email-drafts': EmailDraftsPage,
  'follow-ups': FollowUpsPage,
  'lead-uploads': LeadUploadsPage,
  leads: LeadsPage,
  'manual-compose': ManualComposePage,
  notifications: NotificationsPage,
  'audit-logs': AuditLogsPage,
  replies: RepliesPage,
  'team-decisions': TeamDecisionsPage,
  'team-members': TeamMembersPage,
  'workflow-builder': WorkflowBuilderPage,
  'workflow-settings': WorkflowSettingsPage,
}

function getCurrentPage() {
  const page = window.location.hash.replace('#', '')
  const pathPage = window.location.pathname.replace(/^\//, '')

  if (pages[page]) return page
  if (pages[pathPage]) return pathPage

  return 'dashboard'
}

export default function App() {
  const auth = useAuth()
  const [currentPage, setCurrentPage] = useState(getCurrentPage)
  const Page = pages[currentPage]

  useEffect(() => {
    function handleLocationChange() {
      setCurrentPage(getCurrentPage())
    }

    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('popstate', handleLocationChange)

    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  if (auth.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm font-medium text-slate-600">Loading LeadRubyOrbit...</p>
      </main>
    )
  }

  if (!auth.isAuthenticated) {
    return <LoginPage error={auth.error} isLoading={auth.isLoading} onLogin={auth.login} />
  }

  function handleNavigate(page) {
    window.history.pushState(null, '', `/${page}`)
    setCurrentPage(page)
  }

  if (currentPage === 'workflow-builder') {
    return <Page onNavigate={handleNavigate} />
  }

  return (
    <AppLayout
      authRequired={auth.authRequired}
      currentPage={currentPage}
      onLogout={auth.logout}
      onNavigate={handleNavigate}
      profile={auth.profile}
    >
      <Page />
    </AppLayout>
  )
}
