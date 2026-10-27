-- PREPARATION ONLY — not applied to the connected Supabase project.
-- Before using this file, reconcile the remote migration history with the
-- tracked supabase/migrations directory and create a proper migration through
-- the Supabase CLI. This file is a reviewed proposal, not a deployable migration.
--
-- Purpose: evaluate auth.uid() as a statement-level initplan instead of
-- repeatedly evaluating it per row. These replacements preserve the existing
-- ownership predicate and do not change policy roles or CRUD commands.

ALTER POLICY teams_select_own
  ON public.teams
  USING (auth_user_id = (SELECT auth.uid()));

ALTER POLICY rounds_insert_own
  ON public.rounds
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams AS t
      WHERE t.id = rounds.team_id
        AND t.auth_user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY rounds_select_own
  ON public.rounds
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams AS t
      WHERE t.id = rounds.team_id
        AND t.auth_user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY rounds_update_own
  ON public.rounds
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams AS t
      WHERE t.id = rounds.team_id
        AND t.auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams AS t
      WHERE t.id = rounds.team_id
        AND t.auth_user_id = (SELECT auth.uid())
    )
  );
