alter table public.email_drafts
  add column if not exists ai_model text,
  add column if not exists ai_prompt text,
  add column if not exists ai_tone text,
  add column if not exists ai_generation_type text,
  add column if not exists ai_source jsonb not null default '{}'::jsonb;

create index if not exists idx_email_drafts_ai_generation_type
  on public.email_drafts(ai_generation_type)
  where ai_generated = true;
