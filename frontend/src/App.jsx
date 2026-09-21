import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LeadUploadsPage } from '@/pages/LeadUploadsPage'

const pages = {
  dashboard: DashboardPage,
  'lead-uploads': LeadUploadsPage,
}

function getCurrentPage() {
  const page = window.location.hash.replace('#', '')
  return pages[page] ? page : 'dashboard'
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
