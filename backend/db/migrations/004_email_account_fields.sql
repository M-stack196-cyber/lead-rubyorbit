alter table public.email_accounts
add column if not exists account_name text,
add column if not exists email_address text,
add column if not exists from_name text,
add column if not exists is_enabled boolean not null default false,
add column if not exists daily_send_limit integer not null default 50,
add column if not exists smtp_host text,
add column if not exists smtp_port integer,
add column if not exists smtp_username text,
add column if not exists smtp_secure boolean not null default false,
add column if not exists encrypted_secret_placeholder text,
add column if not exists notes text;

update public.email_accounts
set
  email_address = coalesce(email_address, email),
  account_name = coalesce(account_name, display_name, email),
  from_name = coalesce(from_name, display_name),
  daily_send_limit = coalesce(daily_send_limit, daily_limit, 50),
  is_enabled = case
    when status in ('active', 'enabled') then true
    else coalesce(is_enabled, false)
  end,
  status = case
    when status = 'enabled' then 'active'
    when status = 'deleted' then 'archived'
    else status
  end;

alter table public.email_accounts
drop constraint if exists email_accounts_status_check;

alter table public.email_accounts
add constraint email_accounts_status_check
check (status in ('draft', 'active', 'disabled', 'archived', 'error'));

alter table public.email_accounts
drop constraint if exists email_accounts_provider_check;

alter table public.email_accounts
add constraint email_accounts_provider_check
check (provider in ('smtp', 'gmail', 'outlook', 'custom'));

alter table public.email_accounts
add constraint email_accounts_daily_send_limit_check
check (daily_send_limit > 0);

create index if not exists idx_email_accounts_status
on public.email_accounts(status);

create index if not exists idx_email_accounts_provider
on public.email_accounts(provider);
