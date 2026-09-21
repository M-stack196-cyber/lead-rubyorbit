alter table public.replies
  add column if not exists email_account_id uuid references public.email_accounts(id),
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists body_preview text,
  add column if not exists raw_payload jsonb,
  add column if not exists updated_at timestamptz default now();

update public.replies
set
  gmail_message_id = coalesce(gmail_message_id, provider_message_id),
  gmail_thread_id = coalesce(gmail_thread_id, provider_thread_id),
  body_preview = coalesce(body_preview, body)
where gmail_message_id is null
   or gmail_thread_id is null
   or body_preview is null;

alter table public.sent_emails
  drop constraint if exists sent_emails_status_check;

alter table public.sent_emails
  add constraint sent_emails_status_check
  check (status in ('queued', 'sent', 'failed', 'blocked', 'waiting_reply', 'replied', 'no_reply'));

create unique index if not exists idx_replies_gmail_message_id_unique
  on public.replies(gmail_message_id)
  where gmail_message_id is not null;

create index if not exists idx_replies_sent_email_id
  on public.replies(sent_email_id);

create index if not exists idx_replies_campaign_id
  on public.replies(campaign_id);

create index if not exists idx_replies_gmail_thread_id
  on public.replies(gmail_thread_id);

drop trigger if exists set_replies_updated_at on public.replies;

create trigger set_replies_updated_at
before update on public.replies
for each row execute function public.set_updated_at();
