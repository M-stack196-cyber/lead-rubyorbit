alter table public.email_drafts
  add column if not exists previous_sent_email_id uuid references public.sent_emails(id) on delete set null,
  add column if not exists source_team_decision_id uuid references public.team_decisions(id) on delete set null,
  add column if not exists source_no_reply_sent_email_id uuid references public.sent_emails(id) on delete set null;

alter table public.campaign_leads
  add column if not exists followup_count integer not null default 0,
  add column if not exists last_followup_draft_id uuid references public.email_drafts(id) on delete set null;

create index if not exists idx_email_drafts_previous_sent_email_id
  on public.email_drafts(previous_sent_email_id);

create index if not exists idx_email_drafts_source_team_decision_id
  on public.email_drafts(source_team_decision_id);

create index if not exists idx_email_drafts_source_no_reply_sent_email_id
  on public.email_drafts(source_no_reply_sent_email_id);

create index if not exists idx_campaign_leads_last_followup_draft_id
  on public.campaign_leads(last_followup_draft_id);

create unique index if not exists idx_email_drafts_unique_unsent_followup_source
  on public.email_drafts(campaign_lead_id, source_no_reply_sent_email_id)
  where type in ('follow_up', 'followup')
    and source_no_reply_sent_email_id is not null
    and status in ('draft', 'saved', 'pending_approval', 'approved', 'rejected');
