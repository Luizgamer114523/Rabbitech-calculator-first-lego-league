CREATE OR REPLACE FUNCTION public.is_team_workspace_manager(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = p_team_id
        AND t.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships m
      WHERE m.team_id = p_team_id
        AND m.user_id = auth.uid()
        AND m.role = 'leader'
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.app_admins a
        WHERE a.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.team_memberships m
        WHERE m.team_id = p_team_id
          AND m.user_id = auth.uid()
      )
    )
  );
$function$;

-- RLS remains responsible for deciding which rows can be deleted.
-- These table grants make the existing author/manager DELETE policies usable.
GRANT DELETE ON TABLE public.team_messages TO authenticated;
GRANT DELETE ON TABLE public.team_round_logs TO authenticated;
