alter table public.campaign_leads
add column if not exists ghl_sync_error text,
add column if not exists ghl_synced_at timestamptz,
add column if not exists ghl_workflow_id text;

create index if not exists idx_campaign_leads_ghl_sync_status
on public.campaign_leads(ghl_sync_status);
