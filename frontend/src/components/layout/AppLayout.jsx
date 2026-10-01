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
  children,
  currentPage = 'dashboard',
  onLogout,
  onNavigate,
  profile,
}) {
  const userLabel =
    profile?.teamMember?.full_name || profile?.teamMember?.email || profile?.user?.email || 'Workspace user'
  const userEmail = profile?.teamMember?.email || profile?.user?.email || ''
  const accessRole = profile?.role || profile?.workspace?.role || 'local'
  const roleLabel = profile?.role || profile?.workspace?.role || 'Member'
  const workspaceLabel = profile?.workspace?.name || 'Workspace'
  const visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles?.length || accessRole === 'local') return true
        return item.roles.includes(accessRole)
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] lg:flex">
      <aside className="bg-slate-950 text-slate-100 shadow-2xl lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 shadow-sm">
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
                        'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white',
                        item.page === currentPage && 'bg-white text-slate-950 shadow-sm',
                        !item.page && 'cursor-default opacity-60 hover:bg-transparent hover:text-slate-300',
                      )}
                      aria-current={item.page === currentPage ? 'page' : undefined}
                      onClick={(event) => handleNavigate(event, item.page)}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-500',
                          item.page === currentPage && 'text-slate-950',
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

          <div className="mt-auto border-t border-slate-800/80 p-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                  {String(userLabel || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{userLabel}</p>
                  {userEmail ? <p className="truncate text-xs text-slate-400">{userEmail}</p> : null}
                </div>
              </div>
              <div className="mt-3 grid gap-1 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                <span className="truncate">Role: {roleLabel}</span>
                <span className="truncate">Workspace: {workspaceLabel}</span>
              </div>
              {onLogout ? (
                <button
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  type="button"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              ) : null}
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
