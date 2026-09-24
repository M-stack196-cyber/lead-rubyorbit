create table if not exists public.google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email_account_id uuid not null references public.email_accounts(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  csrf_token text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_google_oauth_states_workspace_id
  on public.google_oauth_states(workspace_id);

create index if not exists idx_google_oauth_states_email_account_id
  on public.google_oauth_states(email_account_id);

create index if not exists idx_google_oauth_states_expires_at
  on public.google_oauth_states(expires_at);

alter table public.google_oauth_states enable row level security;

comment on table public.google_oauth_states is
  'Server-side one-time Google OAuth state records. Backend service role owns inserts/consumption; no authenticated client policies are granted.';
