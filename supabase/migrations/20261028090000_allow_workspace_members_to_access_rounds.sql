-- Keep the existing team-workspace membership model as the single source of truth.
-- Members may read and save rounds only for a team they belong to.
drop policy if exists rounds_select_own on public.rounds;
drop policy if exists rounds_select_team_members on public.rounds;
create policy rounds_select_team_members on public.rounds
for select to authenticated
using (public.is_team_workspace_member(team_id));

drop policy if exists rounds_insert_own on public.rounds;
drop policy if exists rounds_insert_team_members on public.rounds;
create policy rounds_insert_team_members on public.rounds
for insert to authenticated
with check (public.is_team_workspace_member(team_id));

drop policy if exists rounds_update_own on public.rounds;
drop policy if exists rounds_update_team_members on public.rounds;
create policy rounds_update_team_members on public.rounds
for update to authenticated
using (public.is_team_workspace_member(team_id))
with check (public.is_team_workspace_member(team_id));
