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
      'continue_later',
      'interested',
      'not_interested',
      'assign_to_team_member'
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
      'continue_later',
      'interested',
      'not_interested',
      'assign_to_team_member'
    )
  );

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
      'followup_required',
      'interested',
      'not_interested',
      'assigned'
    )
  );

create index if not exists idx_team_decisions_assigned_to
  on public.team_decisions(assigned_to);
