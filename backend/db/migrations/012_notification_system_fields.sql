alter table public.notifications
  add column if not exists campaign_id uuid references public.campaigns(id) on delete cascade,
  add column if not exists lead_id uuid references public.leads(id) on delete cascade,
  add column if not exists campaign_lead_id uuid references public.campaign_leads(id) on delete cascade,
  add column if not exists reply_id uuid references public.replies(id) on delete cascade,
  add column if not exists sent_email_id uuid references public.sent_emails(id) on delete cascade,
  add column if not exists email_draft_id uuid references public.email_drafts(id) on delete cascade,
  add column if not exists team_decision_id uuid references public.team_decisions(id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.notifications
set
  campaign_id = coalesce(campaign_id, related_campaign_id),
  lead_id = coalesce(lead_id, related_lead_id),
  email_draft_id = coalesce(email_draft_id, related_email_draft_id),
  team_decision_id = coalesce(team_decision_id, related_decision_id),
  updated_at = coalesce(updated_at, created_at, now())
where campaign_id is null
  or lead_id is null
  or email_draft_id is null
  or team_decision_id is null
  or updated_at is null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'new_reply',
    'no_reply_detected',
    'team_decision_pending',
    'reply_draft_pending_approval',
    'followup_draft_created',
    'followup_required',
    'draft_approved',
    'system_info'
  ));

alter table public.notifications
  drop constraint if exists notifications_status_check;

alter table public.notifications
  add constraint notifications_status_check
  check (status in ('unread', 'read', 'resolved', 'archived'));

alter table public.notifications
  drop constraint if exists notifications_priority_check;

alter table public.notifications
  add constraint notifications_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists idx_notifications_type
  on public.notifications(type);

create index if not exists idx_notifications_priority
  on public.notifications(priority);

create index if not exists idx_notifications_campaign_id
  on public.notifications(campaign_id);

create index if not exists idx_notifications_lead_id
  on public.notifications(lead_id);

create index if not exists idx_notifications_campaign_lead_id
  on public.notifications(campaign_lead_id);

create index if not exists idx_notifications_reply_id
  on public.notifications(reply_id);

create index if not exists idx_notifications_sent_email_id
  on public.notifications(sent_email_id);

create index if not exists idx_notifications_email_draft_id
  on public.notifications(email_draft_id);

create index if not exists idx_notifications_team_decision_id
  on public.notifications(team_decision_id);

create unique index if not exists idx_notifications_active_new_reply
  on public.notifications(type, reply_id)
  where reply_id is not null
    and status in ('unread', 'read');

create unique index if not exists idx_notifications_active_no_reply_detected
  on public.notifications(type, sent_email_id)
  where sent_email_id is not null
    and status in ('unread', 'read');

create unique index if not exists idx_notifications_active_email_draft
  on public.notifications(type, email_draft_id)
  where email_draft_id is not null
    and status in ('unread', 'read');

create unique index if not exists idx_notifications_active_team_decision
  on public.notifications(type, team_decision_id)
  where team_decision_id is not null
    and status in ('unread', 'read');

create unique index if not exists idx_notifications_active_campaign_lead
  on public.notifications(type, campaign_lead_id)
  where campaign_lead_id is not null
    and reply_id is null
    and sent_email_id is null
    and email_draft_id is null
    and team_decision_id is null
    and status in ('unread', 'read');

drop trigger if exists set_notifications_updated_at on public.notifications;

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();
