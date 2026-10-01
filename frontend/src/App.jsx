import { lazy, Suspense, useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/components/auth/authContext'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmailAccountsPage } from '@/pages/EmailAccountsPage'
import { LeadUploadsPage } from '@/pages/LeadUploadsPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LoginPage, SignupPage } from '@/pages/LoginPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import {
  EmailDraftsPage,
  FollowUpsPage,
  ManualComposePage,
  RepliesPage,
  TeamDecisionsPage,
} from '@/pages/QueuesPage'
import { AuditLogsPage, TeamMembersPage, WorkflowSettingsPage } from '@/pages/AdminPages'

const WorkflowBuilderPage = lazy(() =>
  import('@/pages/WorkflowBuilderPage').then((module) => ({ default: module.WorkflowBuilderPage })),
)

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

function AppLoadingMessage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <p className="text-sm font-medium text-slate-600">Loading LeadRubyOrbit...</p>
    </main>
  )
}

export default function App() {
  const auth = useAuth()
  const [currentPage, setCurrentPage] = useState(getCurrentPage)
  const [locationPath, setLocationPath] = useState(() => window.location.pathname)
  const [authRoute, setAuthRoute] = useState(() => (window.location.pathname === '/signup' ? 'signup' : 'login'))
  const Page = pages[currentPage]

  useEffect(() => {
    function handleLocationChange() {
      setCurrentPage(getCurrentPage())
      setLocationPath(window.location.pathname)
      setAuthRoute(window.location.pathname === '/signup' ? 'signup' : 'login')
    }

    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('popstate', handleLocationChange)

    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  if (auth.isLoading) {
    return <AppLoadingMessage />
  }

  function handleAuthNavigate(path) {
    window.history.pushState(null, '', path)
    setLocationPath(path)
    setAuthRoute(path === '/signup' ? 'signup' : 'login')
    setCurrentPage(getCurrentPage())
  }

  if (!auth.isAuthenticated) {
    if (locationPath !== '/login' && locationPath !== '/signup') {
      window.history.replaceState(null, '', '/login')
    }

    if (authRoute === 'signup') {
      return (
        <SignupPage
          error={auth.error}
          isLoading={auth.isLoading}
          onShowLogin={() => handleAuthNavigate('/login')}
          onSignup={auth.signup}
        />
      )
    }

    return (
      <LoginPage
        error={auth.error}
        isLoading={auth.isLoading}
        onLogin={auth.login}
        onShowSignup={() => handleAuthNavigate('/signup')}
      />
    )
  }

  if ((locationPath === '/login' || locationPath === '/signup') && currentPage === 'dashboard') {
    window.history.replaceState(null, '', '/dashboard')
  }

  function handleNavigate(page) {
    window.history.pushState(null, '', `/${page}`)
    setLocationPath(`/${page}`)
    setCurrentPage(page)
  }

  if (currentPage === 'workflow-builder') {
    return (
      <Suspense fallback={<AppLoadingMessage />}>
        <Page onNavigate={handleNavigate} />
      </Suspense>
    )
  }

  return (
    <AppLayout
      currentPage={currentPage}
      onLogout={auth.authRequired ? auth.logout : null}
      onNavigate={handleNavigate}
      profile={auth.profile}
    >
      <Page />
    </AppLayout>
  )
}
