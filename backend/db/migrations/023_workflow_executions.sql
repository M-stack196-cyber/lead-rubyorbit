create table if not exists public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_draft_id uuid not null references public.workflow_drafts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'paused', 'completed', 'failed')),
  current_node_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_execution_steps (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.workflow_executions(id) on delete cascade,
  node_id text not null,
  node_type text,
  type_key text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'paused', 'skipped', 'failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_executions_workspace_id
  on public.workflow_executions(workspace_id);

create index if not exists idx_workflow_executions_workflow_draft_id
  on public.workflow_executions(workflow_draft_id);

create index if not exists idx_workflow_executions_workspace_status
  on public.workflow_executions(workspace_id, status);

create index if not exists idx_workflow_execution_steps_execution_id
  on public.workflow_execution_steps(execution_id, created_at);

drop trigger if exists set_workflow_executions_updated_at on public.workflow_executions;

create trigger set_workflow_executions_updated_at
before update on public.workflow_executions
for each row execute function public.set_updated_at();

alter table public.workflow_executions enable row level security;
alter table public.workflow_execution_steps enable row level security;

drop policy if exists workflow_executions_workspace_member_select on public.workflow_executions;
create policy workflow_executions_workspace_member_select
on public.workflow_executions
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists workflow_execution_steps_workspace_member_select on public.workflow_execution_steps;
create policy workflow_execution_steps_workspace_member_select
on public.workflow_execution_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.workflow_executions execution
    where execution.id = workflow_execution_steps.execution_id
      and public.workspace_member_can_access(execution.workspace_id)
  )
);
