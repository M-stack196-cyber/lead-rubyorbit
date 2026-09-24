alter table public.email_accounts
  add column if not exists smtp_secret_encrypted text;
