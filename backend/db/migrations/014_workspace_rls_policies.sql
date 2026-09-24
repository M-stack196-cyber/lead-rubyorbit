alter table public.team_members
  add column if not exists auth_user_id uuid unique;

create index if not exists idx_team_members_auth_user_id
  on public.team_members(auth_user_id);

alter table public.team_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.lead_uploads enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.email_accounts enable row level security;
alter table public.email_drafts enable row level security;
alter table public.sent_emails enable row level security;
alter table public.replies enable row level security;
alter table public.followups enable row level security;
alter table public.workflow_settings enable row level security;
alter table public.team_decisions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists team_members_own_select on public.team_members;
create policy team_members_own_select
on public.team_members
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or lower(email) = lower((select auth.jwt() ->> 'email'))
);

drop policy if exists workspace_memberships_own_select on public.workspace_memberships;
create policy workspace_memberships_own_select
on public.workspace_memberships
for select
to authenticated
using (
  team_member_id in (
    select id
    from public.team_members
    where auth_user_id = (select auth.uid())
       or lower(email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select
on public.workspaces
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships
    where workspace_memberships.workspace_id = workspaces.id
      and workspace_memberships.status = 'active'
      and workspace_memberships.team_member_id in (
        select id
        from public.team_members
        where auth_user_id = (select auth.uid())
           or lower(email) = lower((select auth.jwt() ->> 'email'))
      )
  )
);

create or replace function public.workspace_member_can_access(target_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships
    where workspace_memberships.workspace_id = target_workspace_id
      and workspace_memberships.status = 'active'
      and workspace_memberships.team_member_id in (
        select id
        from public.team_members
        where auth_user_id = (select auth.uid())
           or lower(email) = lower((select auth.jwt() ->> 'email'))
      )
  );
$$;

-- Phase 26 staging RLS policy:
-- authenticated clients get workspace-scoped read access only.
-- Mutations are routed through the backend service role plus API authorization/RBAC.
drop policy if exists lead_uploads_workspace_member_all on public.lead_uploads;
drop policy if exists lead_uploads_workspace_member_select on public.lead_uploads;
create policy lead_uploads_workspace_member_select
on public.lead_uploads
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists leads_workspace_member_all on public.leads;
drop policy if exists leads_workspace_member_select on public.leads;
create policy leads_workspace_member_select
on public.leads
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists campaigns_workspace_member_all on public.campaigns;
drop policy if exists campaigns_workspace_member_select on public.campaigns;
create policy campaigns_workspace_member_select
on public.campaigns
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists campaign_leads_workspace_member_all on public.campaign_leads;
drop policy if exists campaign_leads_workspace_member_select on public.campaign_leads;
create policy campaign_leads_workspace_member_select
on public.campaign_leads
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists email_accounts_workspace_member_all on public.email_accounts;
drop policy if exists email_accounts_workspace_member_select on public.email_accounts;
create policy email_accounts_workspace_member_select
on public.email_accounts
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists email_drafts_workspace_member_all on public.email_drafts;
drop policy if exists email_drafts_workspace_member_select on public.email_drafts;
create policy email_drafts_workspace_member_select
on public.email_drafts
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists sent_emails_workspace_member_all on public.sent_emails;
drop policy if exists sent_emails_workspace_member_select on public.sent_emails;
create policy sent_emails_workspace_member_select
on public.sent_emails
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists replies_workspace_member_all on public.replies;
drop policy if exists replies_workspace_member_select on public.replies;
create policy replies_workspace_member_select
on public.replies
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists followups_workspace_member_all on public.followups;
drop policy if exists followups_workspace_member_select on public.followups;
create policy followups_workspace_member_select
on public.followups
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists workflow_settings_workspace_member_all on public.workflow_settings;
drop policy if exists workflow_settings_workspace_member_select on public.workflow_settings;
create policy workflow_settings_workspace_member_select
on public.workflow_settings
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists team_decisions_workspace_member_all on public.team_decisions;
drop policy if exists team_decisions_workspace_member_select on public.team_decisions;
create policy team_decisions_workspace_member_select
on public.team_decisions
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists notifications_workspace_member_all on public.notifications;
drop policy if exists notifications_workspace_member_select on public.notifications;
create policy notifications_workspace_member_select
on public.notifications
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));

drop policy if exists audit_logs_workspace_member_select on public.audit_logs;
create policy audit_logs_workspace_member_select
on public.audit_logs
for select
to authenticated
using (public.workspace_member_can_access(workspace_id));
