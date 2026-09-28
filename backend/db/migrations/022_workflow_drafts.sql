create table if not exists public.workflow_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft')),
  mode text not null default 'visual-only' check (mode in ('visual-only')),
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  validation_status text not null default 'Warning' check (validation_status in ('Passed', 'Warning', 'Error')),
  created_by uuid references public.team_members(id) on delete set null,
  updated_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_drafts_workspace_id
  on public.workflow_drafts(workspace_id);

create index if not exists idx_workflow_drafts_workspace_updated_at
  on public.workflow_drafts(workspace_id, updated_at desc);

create index if not exists idx_workflow_drafts_workspace_status
  on public.workflow_drafts(workspace_id, status);

drop trigger if exists set_workflow_drafts_updated_at on public.workflow_drafts;

create trigger set_workflow_drafts_updated_at
before update on public.workflow_drafts
for each row execute function public.set_updated_at();

alter table public.workflow_drafts enable row level security;

drop policy if exists workflow_drafts_workspace_member_select on public.workflow_drafts;
create policy workflow_drafts_workspace_member_select
on public.workflow_drafts
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));
