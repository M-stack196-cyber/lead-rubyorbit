import {
  Bell,
  BrainCircuit,
  CheckSquare,
  FileUp,
  Inbox,
  LayoutDashboard,
  Mail,
  MailCheck,
  MessageSquareReply,
  Orbit,
  PenLine,
  RefreshCcw,
  Settings2,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Lead Uploads', icon: FileUp },
  { label: 'Leads', icon: Users },
  { label: 'Campaigns', icon: BrainCircuit },
  { label: 'Email Drafts', icon: Mail },
  { label: 'Manual Compose', icon: PenLine },
  { label: 'Replies', icon: MessageSquareReply },
  { label: 'Follow-ups', icon: RefreshCcw },
  { label: 'Team Decisions', icon: CheckSquare },
  { label: 'Email Accounts', icon: MailCheck },
  { label: 'Workflow Settings', icon: Settings2 },
  { label: 'Notifications', icon: Bell },
  { label: 'Team Members', icon: UserRoundCog },
]

export function AppLayout({ children }) {
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

          <nav className="grid gap-1 overflow-y-auto px-3 py-4 sm:grid-cols-2 lg:grid-cols-1">
            {navigationItems.map((item) => (
              <a
                href="#"
                key={item.label}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white',
                  item.active && 'bg-slate-900 text-white shadow-sm',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </nav>
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
