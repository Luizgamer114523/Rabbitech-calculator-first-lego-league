-- Team workspace collaboration: goals, durable notes, round tracking and text chat.
-- Additive only; protected by membership-aware RLS.

CREATE TABLE IF NOT EXISTS public.team_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  target_tasks integer NOT NULL DEFAULT 0 CHECK (target_tasks BETWEEN 0 AND 10000),
  target_rounds integer NOT NULL DEFAULT 0 CHECK (target_rounds BETWEEN 0 AND 10000),
  target_average_score numeric(7,2) NOT NULL DEFAULT 0 CHECK (target_average_score BETWEEN 0 AND 10000),
  due_date date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_round_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  round_number integer NOT NULL CHECK (round_number BETWEEN 1 AND 10000),
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10000),
  start_position text NOT NULL DEFAULT '' CHECK (char_length(start_position) <= 120),
  missions text NOT NULL DEFAULT '' CHECK (char_length(missions) <= 2000),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_goals_team_due_idx ON public.team_goals(team_id,due_date);
CREATE INDEX IF NOT EXISTS team_notes_team_updated_idx ON public.team_notes(team_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS team_round_logs_team_performed_idx ON public.team_round_logs(team_id,performed_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_team_created_idx ON public.team_messages(team_id,created_at DESC);

ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_round_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team members read goals" ON public.team_goals;
CREATE POLICY "team members read goals" ON public.team_goals FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));
DROP POLICY IF EXISTS "team managers create goals" ON public.team_goals;
CREATE POLICY "team managers create goals" ON public.team_goals FOR INSERT TO authenticated
WITH CHECK (public.is_team_workspace_manager(team_id) AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS "team managers update goals" ON public.team_goals;
CREATE POLICY "team managers update goals" ON public.team_goals FOR UPDATE TO authenticated
USING (public.is_team_workspace_manager(team_id))
WITH CHECK (public.is_team_workspace_manager(team_id) AND created_by=(SELECT auth.uid()));
DROP POLICY IF EXISTS "team managers delete goals" ON public.team_goals;
CREATE POLICY "team managers delete goals" ON public.team_goals FOR DELETE TO authenticated
USING (public.is_team_workspace_manager(team_id));

DROP POLICY IF EXISTS "team members read notes" ON public.team_notes;
CREATE POLICY "team members read notes" ON public.team_notes FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));
DROP POLICY IF EXISTS "team members create own notes" ON public.team_notes;
CREATE POLICY "team members create own notes" ON public.team_notes FOR INSERT TO authenticated
WITH CHECK (public.is_team_workspace_member(team_id) AND author_user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "authors or managers update notes" ON public.team_notes;
CREATE POLICY "authors or managers update notes" ON public.team_notes FOR UPDATE TO authenticated
USING (author_user_id=(SELECT auth.uid()) OR public.is_team_workspace_manager(team_id))
WITH CHECK (public.is_team_workspace_member(team_id) AND (author_user_id=(SELECT auth.uid()) OR public.is_team_workspace_manager(team_id)));
DROP POLICY IF EXISTS "authors or managers delete notes" ON public.team_notes;
CREATE POLICY "authors or managers delete notes" ON public.team_notes FOR DELETE TO authenticated
USING (author_user_id=(SELECT auth.uid()) OR public.is_team_workspace_manager(team_id));

DROP POLICY IF EXISTS "team members read round logs" ON public.team_round_logs;
CREATE POLICY "team members read round logs" ON public.team_round_logs FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));
DROP POLICY IF EXISTS "team members create round logs" ON public.team_round_logs;
CREATE POLICY "team members create round logs" ON public.team_round_logs FOR INSERT TO authenticated
WITH CHECK (public.is_team_workspace_member(team_id) AND created_by=(SELECT auth.uid()));

DROP POLICY IF EXISTS "team members read messages" ON public.team_messages;
CREATE POLICY "team members read messages" ON public.team_messages FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));
DROP POLICY IF EXISTS "team members send messages" ON public.team_messages;
CREATE POLICY "team members send messages" ON public.team_messages FOR INSERT TO authenticated
WITH CHECK (public.is_team_workspace_member(team_id) AND author_user_id=(SELECT auth.uid()));

GRANT SELECT ON public.team_goals,public.team_notes,public.team_round_logs,public.team_messages TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.team_goals,public.team_notes TO authenticated;
GRANT INSERT ON public.team_round_logs,public.team_messages TO authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.team_messages_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.create_team_workspace(p_name text,p_display_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team public.teams%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta antes de criar uma equipe.' USING errcode='42501';
  END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'O nome da equipe deve ter entre 2 e 80 caracteres.' USING errcode='22023';
  END IF;
  IF p_display_name IS NULL OR char_length(trim(p_display_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Informe o nome do mentor ou responsável.' USING errcode='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.teams t WHERE t.auth_user_id=v_user)
     OR EXISTS (SELECT 1 FROM public.team_memberships m WHERE m.user_id=v_user) THEN
    RAISE EXCEPTION 'Esta conta já está vinculada a uma equipe.' USING errcode='23505';
  END IF;

  PERFORM public.claim_team_name(trim(p_name));
  SELECT * INTO v_team FROM public.teams t WHERE t.auth_user_id=v_user LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível confirmar a equipe criada. Verifique o cadastro da equipe.' USING errcode='P0001';
  END IF;

  INSERT INTO public.team_memberships(team_id,user_id,display_name,role)
  VALUES(v_team.id,v_user,trim(p_display_name),'leader')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('created',true,'team_id',v_team.id,'team_name',v_team.name,'role','leader');
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_workspace(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_team_workspace(text,text) TO authenticated;
