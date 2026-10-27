-- Rabbitech team workspace: invitations, tasks, Kanban status and activity history.
-- Additive migration. It does not modify the existing scoring/admin tables.

CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 80),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_memberships_one_team_per_user UNIQUE (user_id),
  CONSTRAINT team_memberships_team_user_unique UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 20 CHECK (max_uses BETWEEN 1 AND 100),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  due_date date,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_task_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.team_tasks(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  old_status text CHECK (old_status IS NULL OR old_status IN ('todo', 'in_progress', 'done')),
  new_status text NOT NULL CHECK (new_status IN ('todo', 'in_progress', 'done')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_memberships_team_idx ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS team_tasks_team_status_idx ON public.team_tasks(team_id, status, due_date);
CREATE INDEX IF NOT EXISTS team_tasks_assigned_to_idx ON public.team_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS team_task_events_task_created_idx ON public.team_task_events(task_id, created_at DESC);

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_task_events ENABLE ROW LEVEL SECURITY;

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
    OR EXISTS (
      SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()
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
      SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_memberships m
      WHERE m.team_id = p_team_id AND m.user_id = auth.uid() AND m.role = 'leader'
    )
  );
$$;

DROP POLICY IF EXISTS "team members can read their team memberships" ON public.team_memberships;
CREATE POLICY "team members can read their team memberships"
ON public.team_memberships FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_team_workspace_member(team_id));

DROP POLICY IF EXISTS "team managers can add memberships" ON public.team_memberships;
CREATE POLICY "team managers can add memberships"
ON public.team_memberships FOR INSERT TO authenticated
WITH CHECK (
  public.is_team_workspace_manager(team_id)
  AND role = 'member'
);

DROP POLICY IF EXISTS "team managers can remove memberships" ON public.team_memberships;
CREATE POLICY "team managers can remove memberships"
ON public.team_memberships FOR DELETE TO authenticated
USING (public.is_team_workspace_manager(team_id) AND user_id <> (SELECT auth.uid()));

DROP POLICY IF EXISTS "team members can read tasks" ON public.team_tasks;
CREATE POLICY "team members can read tasks"
ON public.team_tasks FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));

DROP POLICY IF EXISTS "team managers can create tasks" ON public.team_tasks;
CREATE POLICY "team managers can create tasks"
ON public.team_tasks FOR INSERT TO authenticated
WITH CHECK (
  public.is_team_workspace_manager(team_id)
  AND created_by = (SELECT auth.uid())
  AND (
    assigned_to IS NULL OR EXISTS (
      SELECT 1 FROM public.team_memberships m
      WHERE m.team_id = team_tasks.team_id AND m.user_id = team_tasks.assigned_to
    )
  )
);

DROP POLICY IF EXISTS "team managers can edit tasks" ON public.team_tasks;
CREATE POLICY "team managers can edit tasks"
ON public.team_tasks FOR UPDATE TO authenticated
USING (public.is_team_workspace_manager(team_id))
WITH CHECK (
  public.is_team_workspace_manager(team_id)
  AND (
    assigned_to IS NULL OR EXISTS (
      SELECT 1 FROM public.team_memberships m
      WHERE m.team_id = team_tasks.team_id AND m.user_id = team_tasks.assigned_to
    )
  )
);

DROP POLICY IF EXISTS "team managers can delete tasks" ON public.team_tasks;
CREATE POLICY "team managers can delete tasks"
ON public.team_tasks FOR DELETE TO authenticated
USING (public.is_team_workspace_manager(team_id));

DROP POLICY IF EXISTS "team members can read task events" ON public.team_task_events;
CREATE POLICY "team members can read task events"
ON public.team_task_events FOR SELECT TO authenticated
USING (public.is_team_workspace_member(team_id));

CREATE OR REPLACE FUNCTION public.get_my_team_workspace()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_membership public.team_memberships%ROWTYPE;
  v_team public.teams%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('member', false, 'authenticated', false);
  END IF;

  SELECT * INTO v_membership
  FROM public.team_memberships m
  WHERE m.user_id = v_user
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_team FROM public.teams t WHERE t.id = v_membership.team_id;
    RETURN jsonb_build_object(
      'member', true, 'authenticated', true, 'team_id', v_team.id,
      'team_name', v_team.name, 'user_id', v_user,
      'display_name', v_membership.display_name, 'role', v_membership.role,
      'is_manager', public.is_team_workspace_manager(v_team.id)
    );
  END IF;

  SELECT * INTO v_team FROM public.teams t WHERE t.auth_user_id = v_user LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'member', true, 'authenticated', true, 'team_id', v_team.id,
      'team_name', v_team.name, 'user_id', v_user,
      'display_name', coalesce(nullif(auth.jwt() ->> 'email', ''), 'Líder da equipe'),
      'role', 'leader', 'is_manager', true
    );
  END IF;

  RETURN jsonb_build_object(
    'member', false, 'authenticated', true,
    'is_admin', EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = v_user)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_invite(
  p_team_id uuid,
  p_expires_days integer DEFAULT 7,
  p_max_uses integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_invite public.team_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_workspace_manager(p_team_id) THEN
    RAISE EXCEPTION 'Apenas a liderança da equipe pode gerar convites.' USING errcode = '42501';
  END IF;
  IF p_expires_days IS NULL OR p_expires_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'A validade deve ficar entre 1 e 30 dias.' USING errcode = '22023';
  END IF;
  IF p_max_uses IS NULL OR p_max_uses NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O limite deve ficar entre 1 e 100 usos.' USING errcode = '22023';
  END IF;

  v_code := encode(extensions.gen_random_bytes(18), 'hex');
  INSERT INTO public.team_invites(team_id, code_hash, created_by, expires_at, max_uses)
  VALUES (
    p_team_id,
    encode(extensions.digest(lower(trim(v_code)), 'sha256'), 'hex'),
    auth.uid(),
    now() + make_interval(days => p_expires_days),
    p_max_uses
  )
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'code', v_code, 'expires_at', v_invite.expires_at,
    'max_uses', v_invite.max_uses, 'uses_count', v_invite.uses_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_team_with_code(
  p_code text,
  p_display_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_invite public.team_invites%ROWTYPE;
  v_existing public.team_memberships%ROWTYPE;
  v_team_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta antes de entrar na equipe.' USING errcode = '42501';
  END IF;
  IF p_code IS NULL OR length(trim(p_code)) < 20 OR length(trim(p_code)) > 100 THEN
    RAISE EXCEPTION 'Código de convite inválido.' USING errcode = '22023';
  END IF;
  IF p_display_name IS NULL OR char_length(trim(p_display_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Informe um nome entre 1 e 80 caracteres.' USING errcode = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.team_memberships m WHERE m.user_id = v_user LIMIT 1;
  IF FOUND THEN
    SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = v_existing.team_id;
    RETURN jsonb_build_object(
      'joined', true, 'already_member', true, 'team_id', v_existing.team_id,
      'team_name', v_team_name, 'display_name', v_existing.display_name, 'role', v_existing.role
    );
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites i
  WHERE i.code_hash = encode(extensions.digest(lower(trim(p_code)), 'sha256'), 'hex')
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
    AND i.uses_count < i.max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou sem vagas.' USING errcode = '22023';
  END IF;

  INSERT INTO public.team_memberships(team_id, user_id, display_name, role)
  VALUES (v_invite.team_id, v_user, trim(p_display_name), 'member');

  UPDATE public.team_invites SET uses_count = uses_count + 1 WHERE id = v_invite.id;
  SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = v_invite.team_id;

  RETURN jsonb_build_object(
    'joined', true, 'already_member', false, 'team_id', v_invite.team_id,
    'team_name', v_team_name, 'display_name', trim(p_display_name), 'role', 'member'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_team_task_status(
  p_task_id uuid,
  p_status text,
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_task public.team_tasks%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para atualizar uma tarefa.' USING errcode = '42501';
  END IF;
  IF p_status NOT IN ('todo', 'in_progress', 'done') THEN
    RAISE EXCEPTION 'Status de tarefa inválido.' USING errcode = '22023';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'A observação pode ter até 500 caracteres.' USING errcode = '22023';
  END IF;

  SELECT * INTO v_task FROM public.team_tasks t WHERE t.id = p_task_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_team_workspace_member(v_task.team_id) THEN
    RAISE EXCEPTION 'Tarefa não encontrada ou acesso negado.' USING errcode = '42501';
  END IF;
  IF NOT public.is_team_workspace_manager(v_task.team_id)
     AND v_task.assigned_to IS NOT NULL
     AND v_task.assigned_to <> v_user THEN
    RAISE EXCEPTION 'Esta tarefa está atribuída a outro membro.' USING errcode = '42501';
  END IF;

  UPDATE public.team_tasks
  SET status = p_status,
      completed_at = CASE WHEN p_status = 'done' THEN coalesce(completed_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  INSERT INTO public.team_task_events(task_id, team_id, actor_user_id, old_status, new_status, note)
  VALUES (v_task.id, v_task.team_id, v_user, NULL, v_task.status, coalesce(trim(p_note), ''));

  RETURN jsonb_build_object(
    'id', v_task.id, 'status', v_task.status, 'completed_at', v_task.completed_at,
    'updated_at', v_task.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_team_workspace_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_workspace_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_team_workspace() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_team_invite(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_team_with_code(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_team_task_status(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_team_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_workspace_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_invite(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_with_code(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_task_status(uuid, text, text) TO authenticated;

GRANT SELECT ON public.team_memberships, public.team_tasks, public.team_task_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.team_tasks TO authenticated;
GRANT SELECT ON public.team_invites TO authenticated;
