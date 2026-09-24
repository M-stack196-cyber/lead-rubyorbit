update public.team_members
set role = case
  when role = 'team_member' then 'operator'
  when role in ('admin', 'manager', 'operator', 'viewer') then role
  else 'viewer'
end;

alter table public.team_members
  drop constraint if exists team_members_role_check;

alter table public.team_members
  add constraint team_members_role_check
  check (role in ('admin', 'manager', 'operator', 'viewer'));

create index if not exists idx_team_members_status
  on public.team_members(status);
