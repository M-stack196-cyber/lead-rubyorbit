alter table public.workflow_drafts
  add column if not exists is_active boolean not null default false;

create index if not exists idx_workflow_drafts_workspace_active
  on public.workflow_drafts(workspace_id, is_active)
  where is_active = true;

create unique index if not exists idx_workflow_executions_unique_auto_lead_campaign
  on public.workflow_executions(workspace_id, workflow_draft_id, lead_id, campaign_id)
  where context->>'triggerSource' = 'lead_added_to_campaign'
    and lead_id is not null
    and campaign_id is not null;
