-- Cover foreign keys used by team workspace joins and ownership checks.
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_created_by_idx ON public.team_invites(created_by);
CREATE INDEX IF NOT EXISTS team_task_events_actor_user_idx ON public.team_task_events(actor_user_id);
CREATE INDEX IF NOT EXISTS team_task_events_team_id_idx ON public.team_task_events(team_id);
CREATE INDEX IF NOT EXISTS team_tasks_created_by_idx ON public.team_tasks(created_by);
