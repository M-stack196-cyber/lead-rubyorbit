create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  status text not null default 'active' check (status in ('active', 'disabled', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'operator', 'viewer')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (workspace_id, team_member_id)
);

insert into public.workspaces (id, name, slug, status)
values ('00000000-0000-4000-8000-000000000001', 'Default Workspace', 'default', 'active')
on conflict (id) do nothing;

insert into public.workspace_memberships (workspace_id, team_member_id, role, status)
select
  '00000000-0000-4000-8000-000000000001',
  id,
  case
    when role = 'admin' then 'admin'
    when role = 'viewer' then 'viewer'
    else 'operator'
  end,
  status
from public.team_members
on conflict (workspace_id, team_member_id) do nothing;

alter table public.lead_uploads
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.leads
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.campaigns
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.campaign_leads
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.email_accounts
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.email_drafts
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.sent_emails
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.replies
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.followups
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.workflow_settings
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.team_decisions
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.notifications
  add column if not exists workspace_id uuid references public.workspaces(id);

alter table public.audit_logs
  add column if not exists workspace_id uuid references public.workspaces(id);

update public.lead_uploads
set workspace_id = '00000000-0000-4000-8000-000000000001'
where workspace_id is null;

update public.leads
set workspace_id = '00000000-0000-4000-8000-000000000001'
where workspace_id is null;

update public.campaigns
set workspace_id = '00000000-0000-4000-8000-000000000001'
where workspace_id is null;

update public.campaign_leads
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = campaign_leads.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.email_accounts
set workspace_id = '00000000-0000-4000-8000-000000000001'
where workspace_id is null;

update public.email_drafts
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = email_drafts.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.sent_emails
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = sent_emails.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.replies
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = replies.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.followups
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = followups.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.workflow_settings
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = workflow_settings.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.team_decisions
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = team_decisions.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.notifications
set workspace_id = coalesce(
  workspace_id,
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = notifications.related_campaign_id
  ),
  (
    select campaigns.workspace_id
    from public.campaigns
    where campaigns.id = notifications.campaign_id
  ),
  '00000000-0000-4000-8000-000000000001'
)
where workspace_id is null;

update public.audit_logs
set workspace_id = '00000000-0000-4000-8000-000000000001'
where workspace_id is null;

alter table public.lead_uploads
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.leads
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.campaigns
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.campaign_leads
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.email_accounts
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.email_drafts
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.sent_emails
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.replies
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.followups
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.workflow_settings
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.team_decisions
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.notifications
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

alter table public.audit_logs
  alter column workspace_id set default '00000000-0000-4000-8000-000000000001',
  alter column workspace_id set not null;

create index if not exists idx_workspace_memberships_workspace_id
  on public.workspace_memberships(workspace_id);

create index if not exists idx_workspace_memberships_team_member_id
  on public.workspace_memberships(team_member_id);

create index if not exists idx_lead_uploads_workspace_id
  on public.lead_uploads(workspace_id);

create index if not exists idx_leads_workspace_id
  on public.leads(workspace_id);

create index if not exists idx_campaigns_workspace_id
  on public.campaigns(workspace_id);

create index if not exists idx_campaign_leads_workspace_id
  on public.campaign_leads(workspace_id);

create index if not exists idx_email_accounts_workspace_id
  on public.email_accounts(workspace_id);

create index if not exists idx_email_drafts_workspace_id
  on public.email_drafts(workspace_id);

create index if not exists idx_sent_emails_workspace_id
  on public.sent_emails(workspace_id);

create index if not exists idx_replies_workspace_id
  on public.replies(workspace_id);

create index if not exists idx_followups_workspace_id
  on public.followups(workspace_id);

create index if not exists idx_workflow_settings_workspace_id
  on public.workflow_settings(workspace_id);

create index if not exists idx_team_decisions_workspace_id
  on public.team_decisions(workspace_id);

create index if not exists idx_notifications_workspace_id
  on public.notifications(workspace_id);

create index if not exists idx_audit_logs_workspace_id
  on public.audit_logs(workspace_id);

drop trigger if exists set_workspaces_updated_at on public.workspaces;

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_memberships_updated_at on public.workspace_memberships;

create trigger set_workspace_memberships_updated_at
before update on public.workspace_memberships
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
