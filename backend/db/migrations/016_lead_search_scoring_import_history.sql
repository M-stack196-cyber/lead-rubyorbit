alter table public.leads
  add column if not exists tags text[] not null default '{}',
  add column if not exists score integer not null default 0 check (score between 0 and 100),
  add column if not exists normalized_email text,
  add column if not exists dedupe_key text,
  add column if not exists last_imported_at timestamptz,
  add column if not exists duplicate_of_lead_id uuid references public.leads(id);

update public.leads
set
  normalized_email = lower(nullif(trim(email), '')),
  dedupe_key = coalesce(lower(nullif(trim(email), '')), lower(nullif(trim(phone), ''))),
  last_imported_at = coalesce(last_imported_at, created_at)
where normalized_email is null
   or dedupe_key is null
   or last_imported_at is null;

create index if not exists idx_leads_workspace_status
  on public.leads(workspace_id, status);

create index if not exists idx_leads_workspace_normalized_email
  on public.leads(workspace_id, normalized_email);

create index if not exists idx_leads_workspace_score
  on public.leads(workspace_id, score);

create index if not exists idx_leads_workspace_tags
  on public.leads using gin(tags);

create index if not exists idx_leads_workspace_dedupe_key
  on public.leads(workspace_id, dedupe_key);

alter table public.lead_uploads
  add column if not exists imported_rows integer not null default 0,
  add column if not exists skipped_rows integer not null default 0,
  add column if not exists confirmed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_lead_uploads_workspace_created_at
  on public.lead_uploads(workspace_id, created_at desc);
