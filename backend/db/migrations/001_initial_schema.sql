create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique not null,
  role text not null check (role in ('admin', 'team_member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.lead_uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  file_size bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'parsed', 'confirmed', 'failed')),
  total_rows integer default 0,
  valid_rows integer default 0,
  invalid_rows integer default 0,
  duplicate_rows integer default 0,
  uploaded_by uuid references public.team_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_upload_id uuid references public.lead_uploads(id),
  name text,
  email text,
  phone text,
  company text,
  website text,
  linkedin_url text,
  location text,
  notes text,
  source text,
  status text not null default 'new' check (status in ('new', 'imported', 'in_campaign', 'paused', 'stopped', 'replied', 'no_reply')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  ghl_workflow_id text,
  created_by uuid references public.team_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  ghl_contact_id text,
  ghl_sync_status text not null default 'pending' check (ghl_sync_status in ('pending', 'synced', 'failed')),
  outreach_status text not null default 'pending' check (outreach_status in ('pending', 'synced_to_ghl', 'ghl_failed', 'primary_draft_created', 'awaiting_approval', 'email_sent', 'waiting_reply', 'replied', 'no_reply', 'paused', 'stopped', 'followup_required')),
  current_step integer default 0,
  last_email_sent_at timestamptz,
  reply_detected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_id, lead_id)
);

create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  provider text not null,
  display_name text,
  status text not null default 'enabled' check (status in ('enabled', 'disabled', 'deleted')),
  daily_limit integer,
  sent_today integer default 0,
  last_used_at timestamptz,
  config jsonb default '{}'::jsonb,
  created_by uuid references public.team_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_lead_id uuid references public.campaign_leads(id) on delete cascade,
  type text not null check (type in ('primary', 'followup', 'reply', 'manual')),
  subject text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'saved', 'approved', 'rejected', 'sent')),
  ai_generated boolean default false,
  manual_created boolean default false,
  followup_number integer,
  created_by uuid references public.team_members(id),
  approved_by uuid references public.team_members(id),
  approved_at timestamptz,
  rejected_by uuid references public.team_members(id),
  rejected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  email_draft_id uuid references public.email_drafts(id),
  campaign_id uuid references public.campaigns(id),
  lead_id uuid references public.leads(id),
  campaign_lead_id uuid references public.campaign_leads(id),
  email_account_id uuid references public.email_accounts(id),
  to_email text,
  from_email text,
  subject text,
  body text,
  provider_message_id text,
  provider_thread_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'waiting_reply', 'replied', 'no_reply')),
  sent_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  sent_email_id uuid references public.sent_emails(id),
  campaign_id uuid references public.campaigns(id),
  lead_id uuid references public.leads(id),
  campaign_lead_id uuid references public.campaign_leads(id),
  from_email text,
  to_email text,
  subject text,
  body text,
  provider_message_id text,
  provider_thread_id text,
  received_at timestamptz,
  created_at timestamptz default now()
);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id),
  lead_id uuid references public.leads(id),
  campaign_lead_id uuid references public.campaign_leads(id),
  email_draft_id uuid references public.email_drafts(id),
  followup_number integer not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'skipped', 'stopped')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.workflow_settings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  reply_check_interval_value integer not null default 5,
  reply_check_interval_unit text not null default 'minutes' check (reply_check_interval_unit in ('seconds', 'minutes', 'hours', 'days')),
  reply_waiting_time_value integer not null default 2,
  reply_waiting_time_unit text not null default 'days' check (reply_waiting_time_unit in ('seconds', 'minutes', 'hours', 'days')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_id)
);

create table public.team_decisions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id),
  lead_id uuid references public.leads(id),
  campaign_lead_id uuid references public.campaign_leads(id),
  reason text not null check (reason in ('lead_replied', 'no_reply_timeout', 'manual_review')),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'cancelled')),
  action text check (action in ('stop_outreach', 'create_followup', 'ai_draft_reply', 'manual_email', 'move_stage', 'manual_handling')),
  notes text,
  resolved_by uuid references public.team_members(id),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'unread' check (status in ('unread', 'read')),
  related_campaign_id uuid references public.campaigns(id),
  related_lead_id uuid references public.leads(id),
  related_email_draft_id uuid references public.email_drafts(id),
  related_decision_id uuid references public.team_decisions(id),
  created_at timestamptz default now(),
  read_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.team_members(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_leads_email on public.leads(email);
create index idx_leads_status on public.leads(status);
create index idx_campaigns_status on public.campaigns(status);
create index idx_campaign_leads_campaign_id on public.campaign_leads(campaign_id);
create index idx_campaign_leads_lead_id on public.campaign_leads(lead_id);
create index idx_campaign_leads_outreach_status on public.campaign_leads(outreach_status);
create index idx_email_drafts_status on public.email_drafts(status);
create index idx_email_drafts_type on public.email_drafts(type);
create index idx_sent_emails_status on public.sent_emails(status);
create index idx_sent_emails_provider_thread_id on public.sent_emails(provider_thread_id);
create index idx_replies_lead_id on public.replies(lead_id);
create index idx_notifications_status on public.notifications(status);
create index idx_team_decisions_status on public.team_decisions(status);
create index idx_audit_logs_actor_id on public.audit_logs(actor_id);

create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create trigger set_lead_uploads_updated_at
before update on public.lead_uploads
for each row execute function public.set_updated_at();

create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create trigger set_campaign_leads_updated_at
before update on public.campaign_leads
for each row execute function public.set_updated_at();

create trigger set_email_accounts_updated_at
before update on public.email_accounts
for each row execute function public.set_updated_at();

create trigger set_email_drafts_updated_at
before update on public.email_drafts
for each row execute function public.set_updated_at();

create trigger set_sent_emails_updated_at
before update on public.sent_emails
for each row execute function public.set_updated_at();

create trigger set_followups_updated_at
before update on public.followups
for each row execute function public.set_updated_at();

create trigger set_workflow_settings_updated_at
before update on public.workflow_settings
for each row execute function public.set_updated_at();

create trigger set_team_decisions_updated_at
before update on public.team_decisions
for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;
alter table public.lead_uploads enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.email_accounts enable row level security;
alter table public.email_drafts enable row level security;
alter table public.sent_emails enable row level security;
alter table public.replies enable row level security;
alter table public.followups enable row level security;
alter table public.workflow_settings enable row level security;
alter table public.team_decisions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
