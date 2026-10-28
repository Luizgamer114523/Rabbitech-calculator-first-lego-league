-- Allow a team member to remove their own chat messages and round logs.
-- Team managers may moderate content within their own team.
DROP POLICY IF EXISTS "authors or managers delete messages" ON public.team_messages;
CREATE POLICY "authors or managers delete messages"
ON public.team_messages
FOR DELETE
TO authenticated
USING (
  author_user_id = (SELECT auth.uid())
  OR public.is_team_workspace_manager(team_id)
);

DROP POLICY IF EXISTS "authors or managers delete round logs" ON public.team_round_logs;
CREATE POLICY "authors or managers delete round logs"
ON public.team_round_logs
FOR DELETE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.is_team_workspace_manager(team_id)
);
