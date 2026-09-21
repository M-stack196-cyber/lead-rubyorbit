alter table public.email_drafts
  add column if not exists reply_id uuid references public.replies(id) on delete set null,
  add column if not exists sent_email_id uuid references public.sent_emails(id) on delete set null,
  add column if not exists sent_email_id_after_send uuid references public.sent_emails(id) on delete set null;

alter table public.email_drafts
  drop constraint if exists email_drafts_type_check;

alter table public.email_drafts
  add constraint email_drafts_type_check
  check (type in ('primary', 'follow_up', 'followup', 'reply', 'manual'));

alter table public.email_drafts
  drop constraint if exists email_drafts_status_check;

alter table public.email_drafts
  add constraint email_drafts_status_check
  check (status in ('draft', 'saved', 'pending_approval', 'approved', 'rejected', 'sent'));

update public.email_drafts draft
set
  reply_id = (
    select reply.id
    from public.replies reply
    where reply.campaign_id = draft.campaign_id
      and reply.lead_id = draft.lead_id
      and (
        draft.campaign_lead_id is null
        or reply.campaign_lead_id = draft.campaign_lead_id
      )
    order by reply.created_at desc
    limit 1
  ),
  sent_email_id = (
    select reply.sent_email_id
    from public.replies reply
    where reply.campaign_id = draft.campaign_id
      and reply.lead_id = draft.lead_id
      and (
        draft.campaign_lead_id is null
        or reply.campaign_lead_id = draft.campaign_lead_id
      )
    order by reply.created_at desc
    limit 1
  )
where draft.type = 'reply'
  and draft.reply_id is null;

create index if not exists idx_email_drafts_reply_id
  on public.email_drafts(reply_id);

create index if not exists idx_email_drafts_sent_email_id
  on public.email_drafts(sent_email_id);

create index if not exists idx_email_drafts_sent_email_id_after_send
  on public.email_drafts(sent_email_id_after_send);

create index if not exists idx_email_drafts_reply_status
  on public.email_drafts(type, status)
  where type = 'reply';
