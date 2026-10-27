-- Restrict team workspace access to members and leaders of that team.
-- Site-wide administrators do not automatically gain access to private team tasks or chat.

CREATE OR REPLACE FUNCTION public.is_team_workspace_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.team_memberships m
      WHERE m.team_id = p_team_id AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p_team_id AND t.auth_user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_workspace_manager(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p_team_id AND t.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_memberships m
      WHERE m.team_id = p_team_id AND m.user_id = auth.uid() AND m.role = 'leader'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_workspace_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_workspace_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_workspace_manager(uuid) TO authenticated;
