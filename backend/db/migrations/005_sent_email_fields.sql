alter table public.sent_emails
  add column if not exists provider text,
  add column if not exists message_id text,
  add column if not exists thread_id text,
  add column if not exists error_message text;

update public.sent_emails
set
  message_id = coalesce(message_id, provider_message_id),
  thread_id = coalesce(thread_id, provider_thread_id)
where message_id is null
   or thread_id is null;

alter table public.sent_emails
  drop constraint if exists sent_emails_status_check;

alter table public.sent_emails
  add constraint sent_emails_status_check
  check (status in ('queued', 'sent', 'failed', 'blocked', 'waiting_reply', 'replied', 'no_reply'));

create index if not exists idx_sent_emails_email_draft_id
  on public.sent_emails(email_draft_id);

create index if not exists idx_sent_emails_campaign_id
  on public.sent_emails(campaign_id);

create unique index if not exists idx_sent_emails_unique_sent_draft
  on public.sent_emails(email_draft_id)
  where status = 'sent';
