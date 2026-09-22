import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmailAccountsPage } from '@/pages/EmailAccountsPage'
import { LeadUploadsPage } from '@/pages/LeadUploadsPage'
import { NotificationsPage } from '@/pages/NotificationsPage'

const pages = {
  campaigns: CampaignsPage,
  dashboard: DashboardPage,
  'email-accounts': EmailAccountsPage,
  'lead-uploads': LeadUploadsPage,
  notifications: NotificationsPage,
}

function getCurrentPage() {
  const page = window.location.hash.replace('#', '')
  const pathPage = window.location.pathname.replace(/^\//, '')

  if (pages[page]) return page
  if (pages[pathPage]) return pathPage

  return 'dashboard'
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getCurrentPage)
  const Page = pages[currentPage]

  useEffect(() => {
    function handleHashChange() {
      setCurrentPage(getCurrentPage())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return (
    <AppLayout currentPage={currentPage}>
      <Page />
    </AppLayout>
  )
}
