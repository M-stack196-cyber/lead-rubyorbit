alter table public.email_drafts
add column if not exists rejected_reason text;

alter table public.email_drafts
drop constraint if exists email_drafts_type_check;

alter table public.email_drafts
add constraint email_drafts_type_check
check (type in ('primary', 'follow_up', 'followup', 'reply', 'manual'));

create index if not exists idx_email_drafts_campaign_id
on public.email_drafts(campaign_id);
