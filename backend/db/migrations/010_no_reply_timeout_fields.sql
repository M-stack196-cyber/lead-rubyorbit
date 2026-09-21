alter table public.sent_emails
  add column if not exists no_reply_checked_at timestamptz,
  add column if not exists no_reply_due_at timestamptz,
  add column if not exists no_reply_marked_at timestamptz,
  add column if not exists reply_deadline_at timestamptz;

alter table public.campaign_leads
  add column if not exists last_no_reply_checked_at timestamptz,
  add column if not exists next_followup_due_at timestamptz;

create index if not exists idx_sent_emails_no_reply_due_at
  on public.sent_emails(no_reply_due_at);

create index if not exists idx_sent_emails_no_reply_marked_at
  on public.sent_emails(no_reply_marked_at);

create index if not exists idx_campaign_leads_next_followup_due_at
  on public.campaign_leads(next_followup_due_at);

create unique index if not exists idx_team_decisions_unique_pending_no_reply_sent_email
  on public.team_decisions(sent_email_id)
  where sent_email_id is not null
    and reply_id is null
    and status = 'pending'
    and reason = 'no_reply_timeout';
