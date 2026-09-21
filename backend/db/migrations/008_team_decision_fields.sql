alter table public.team_decisions
  add column if not exists reply_id uuid references public.replies(id) on delete cascade,
  add column if not exists sent_email_id uuid references public.sent_emails(id),
  add column if not exists decision_type text,
  add column if not exists assigned_to uuid references public.team_members(id),
  add column if not exists created_by uuid references public.team_members(id);

update public.team_decisions
set decision_type = case
  when coalesce(decision_type, action) in (
    'stop_outreach',
    'manual_handling',
    'create_reply_draft',
    'mark_qualified',
    'continue_later'
  ) then coalesce(decision_type, action)
  else 'manual_handling'
end
where decision_type is null;

alter table public.team_decisions
  drop constraint if exists team_decisions_status_check;

update public.team_decisions
set status = 'completed'
where status = 'resolved';

alter table public.team_decisions
  add constraint team_decisions_status_check
  check (status in ('pending', 'completed', 'cancelled'));

alter table public.team_decisions
  drop constraint if exists team_decisions_action_check;

alter table public.team_decisions
  add constraint team_decisions_action_check
  check (
    action is null
    or action in (
      'stop_outreach',
      'create_followup',
      'ai_draft_reply',
      'manual_email',
      'move_stage',
      'manual_handling',
      'create_reply_draft',
      'mark_qualified',
      'continue_later'
    )
  );

alter table public.team_decisions
  drop constraint if exists team_decisions_decision_type_check;

alter table public.team_decisions
  add constraint team_decisions_decision_type_check
  check (
    decision_type in (
      'stop_outreach',
      'manual_handling',
      'create_reply_draft',
      'mark_qualified',
      'continue_later'
    )
  );

alter table public.team_decisions
  alter column decision_type set not null;

alter table public.campaign_leads
  drop constraint if exists campaign_leads_outreach_status_check;

alter table public.campaign_leads
  add constraint campaign_leads_outreach_status_check
  check (
    outreach_status in (
      'pending',
      'synced_to_ghl',
      'ghl_failed',
      'primary_draft_created',
      'awaiting_approval',
      'email_sent',
      'waiting_reply',
      'replied',
      'no_reply',
      'paused',
      'stopped',
      'qualified',
      'followup_required'
    )
  );

create index if not exists idx_team_decisions_campaign_id
  on public.team_decisions(campaign_id);

create index if not exists idx_team_decisions_reply_id
  on public.team_decisions(reply_id);

create index if not exists idx_team_decisions_sent_email_id
  on public.team_decisions(sent_email_id);

create unique index if not exists idx_team_decisions_unique_pending_reply
  on public.team_decisions(reply_id)
  where reply_id is not null and status = 'pending';
