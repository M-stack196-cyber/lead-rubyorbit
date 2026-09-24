alter table public.workflow_settings
  add column if not exists no_reply_timeout_days integer not null default 3,
  add column if not exists automation_campaign_batch_size integer not null default 25,
  add column if not exists create_followup_drafts boolean not null default false,
  add column if not exists followup_draft_batch_size integer not null default 25;

alter table public.workflow_settings
  drop constraint if exists workflow_settings_no_reply_timeout_days_check;

alter table public.workflow_settings
  add constraint workflow_settings_no_reply_timeout_days_check
  check (no_reply_timeout_days between 1 and 30);

alter table public.workflow_settings
  drop constraint if exists workflow_settings_automation_campaign_batch_size_check;

alter table public.workflow_settings
  add constraint workflow_settings_automation_campaign_batch_size_check
  check (automation_campaign_batch_size between 1 and 100);

alter table public.workflow_settings
  drop constraint if exists workflow_settings_followup_draft_batch_size_check;

alter table public.workflow_settings
  add constraint workflow_settings_followup_draft_batch_size_check
  check (followup_draft_batch_size between 1 and 100);

create unique index if not exists idx_workflow_settings_workspace_default_unique
  on public.workflow_settings(workspace_id)
  where campaign_id is null;
