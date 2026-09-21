alter table public.email_accounts
  add column if not exists gmail_user_id text,
  add column if not exists gmail_email text,
  add column if not exists gmail_connected_at timestamptz,
  add column if not exists gmail_token_status text default 'disconnected',
  add column if not exists gmail_refresh_token_encrypted text,
  add column if not exists gmail_access_token_encrypted text,
  add column if not exists gmail_token_expires_at timestamptz,
  add column if not exists gmail_scope text,
  add column if not exists gmail_last_error text;

alter table public.email_accounts
  drop constraint if exists email_accounts_gmail_token_status_check;

alter table public.email_accounts
  add constraint email_accounts_gmail_token_status_check
  check (gmail_token_status in ('disconnected', 'connected', 'error', 'expired'));

create index if not exists idx_email_accounts_gmail_token_status
  on public.email_accounts(gmail_token_status);

create index if not exists idx_email_accounts_gmail_email
  on public.email_accounts(gmail_email);
