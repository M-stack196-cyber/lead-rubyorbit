alter table public.workflow_executions
  add column if not exists scheduled_resume_at timestamptz,
  add column if not exists pause_reason text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists canceled_at timestamptz;

alter table public.workflow_executions
  drop constraint if exists workflow_executions_status_check;

alter table public.workflow_executions
  add constraint workflow_executions_status_check
  check (status in ('running', 'paused', 'completed', 'failed', 'canceled'));

create index if not exists idx_workflow_executions_scheduled_resume
  on public.workflow_executions(workspace_id, scheduled_resume_at)
  where status = 'paused'
    and pause_reason = 'scheduled_wait'
    and scheduled_resume_at is not null;
