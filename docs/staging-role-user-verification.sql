-- Read-only staging verification for Phase 9 role users.
-- Expected after setup: one active linked member for each role.

with role_counts as (
  select
    wm.role,
    count(*) filter (
      where wm.status = 'active'
        and tm.status = 'active'
        and tm.auth_user_id is not null
    ) as active_linked_members
  from public.workspace_memberships wm
  join public.team_members tm on tm.id = wm.team_member_id
  group by wm.role
),
expected_roles(role) as (
  values ('admin'), ('manager'), ('operator'), ('viewer')
)
select
  expected_roles.role,
  coalesce(role_counts.active_linked_members, 0) as active_linked_members,
  case
    when coalesce(role_counts.active_linked_members, 0) >= 1 then 'pass'
    else 'missing'
  end as verification_status
from expected_roles
left join role_counts on role_counts.role = expected_roles.role
order by expected_roles.role;

-- Detail view for auditing exact linked users.
select
  wm.role,
  wm.status as membership_status,
  tm.email,
  tm.status as member_status,
  tm.auth_user_id,
  wm.workspace_id
from public.workspace_memberships wm
join public.team_members tm on tm.id = wm.team_member_id
order by wm.role, tm.email;
