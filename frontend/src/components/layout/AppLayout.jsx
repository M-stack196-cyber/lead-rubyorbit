import {
  Bell,
  BrainCircuit,
  CheckSquare,
  FileClock,
  FileUp,
  LayoutDashboard,
  LogOut,
  Mail,
  MailCheck,
  MessageSquareReply,
  Orbit,
  PenLine,
  RefreshCcw,
  Settings2,
  UserRoundCog,
  Users,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationSections = [
  {
    label: 'Main',
    items: [
      { label: 'Workflow Builder', icon: Workflow, page: 'workflow-builder' },
      { label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Lead Uploads', icon: FileUp, page: 'lead-uploads' },
      { label: 'Leads', icon: Users, page: 'leads' },
      { label: 'Campaigns', icon: BrainCircuit, page: 'campaigns' },
      { label: 'Manual Compose', icon: PenLine, page: 'manual-compose' },
      { label: 'Email Drafts', icon: Mail, page: 'email-drafts' },
      { label: 'Replies', icon: MessageSquareReply, page: 'replies' },
      { label: 'Follow-ups', icon: RefreshCcw, page: 'follow-ups' },
      { label: 'Team Decisions', icon: CheckSquare, page: 'team-decisions' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Email Accounts', icon: MailCheck, page: 'email-accounts', roles: ['admin', 'manager'] },
      { label: 'Workflow Settings', icon: Settings2, page: 'workflow-settings', roles: ['admin', 'manager'] },
      { label: 'Notifications', icon: Bell, page: 'notifications' },
      { label: 'Team Members', icon: UserRoundCog, page: 'team-members', roles: ['admin'] },
      { label: 'Audit Logs', icon: FileClock, page: 'audit-logs', roles: ['admin'] },
    ],
  },
]

export function AppLayout({
  authRequired = false,
  children,
  currentPage = 'dashboard',
  onLogout,
  onNavigate,
  profile,
}) {
  const userLabel =
    profile?.teamMember?.full_name || profile?.teamMember?.email || profile?.user?.email || 'Demo user'
  const roleLabel = profile?.role || profile?.workspace?.role || 'demo'
  const visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles?.length || roleLabel === 'demo') return true
        return item.roles.includes(roleLabel)
      }),
    }))
    .filter((section) => section.items.length)

  function handleNavigate(event, page) {
    if (!page || !onNavigate) return

    event.preventDefault()
    onNavigate(page)
  }

  function getItemHref(page) {
    return page ? `/${page}` : '#'
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="bg-slate-950 text-slate-100 lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Orbit className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-semibold leading-5">LeadRubyOrbit</p>
              <p className="text-xs text-slate-400">Outreach operations</p>
            </div>
          </div>

          <nav className="grid gap-5 overflow-y-auto px-3 py-4 sm:grid-cols-3 lg:grid-cols-1">
            {visibleNavigationSections.map((section) => (
              <div className="grid gap-1" key={section.label}>
                <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                  {section.label}
                </p>
                <div className="grid gap-1">
                  {section.items.map((item) => (
                    <a
                      href={getItemHref(item.page)}
                      key={item.label}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white',
                        item.page === currentPage && 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700',
                        !item.page && 'cursor-default opacity-60 hover:bg-transparent hover:text-slate-300',
                      )}
                      aria-current={item.page === currentPage ? 'page' : undefined}
                      onClick={(event) => handleNavigate(event, item.page)}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-500',
                          item.page === currentPage && 'text-primary-foreground',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-800 p-3">
            <div className="rounded-md bg-slate-900 px-3 py-3">
              <p className="truncate text-sm font-semibold text-white">{userLabel}</p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {roleLabel}
                {profile?.workspace?.name ? ` - ${profile.workspace.name}` : ''}
              </p>
              {authRequired && onLogout ? (
                <button
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                  type="button"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              ) : (
                <p className="mt-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                  Demo mode active
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen flex-1 lg:pl-72">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
