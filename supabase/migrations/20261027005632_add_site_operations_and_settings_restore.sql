ALTER TABLE public.rabbitech_site_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text NOT NULL DEFAULT 'O Rabbitech está em manutenção programada. Voltaremos em breve.',
  ADD COLUMN IF NOT EXISTS scheduled_notice_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scheduled_notice_type text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS scheduled_notice_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_notice_end_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rabbitech_settings_scheduled_notice_type_check') THEN
    ALTER TABLE public.rabbitech_site_settings ADD CONSTRAINT rabbitech_settings_scheduled_notice_type_check
      CHECK (scheduled_notice_type IN ('info','success','warning'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rabbitech_settings_scheduled_notice_range_check') THEN
    ALTER TABLE public.rabbitech_site_settings ADD CONSTRAINT rabbitech_settings_scheduled_notice_range_check
      CHECK (scheduled_notice_start_at IS NULL OR scheduled_notice_end_at IS NULL OR scheduled_notice_end_at > scheduled_notice_start_at);
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS rabbitech_private;
REVOKE ALL ON SCHEMA rabbitech_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS rabbitech_private.site_settings_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  action text NOT NULL,
  before_state jsonb,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rabbitech_private.site_settings_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE rabbitech_private.site_settings_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA rabbitech_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rb_snapshot_rabbitech_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_action text;
BEGIN
  IF (to_jsonb(OLD) - 'updated_at' - 'updated_by')
       IS NOT DISTINCT FROM
     (to_jsonb(NEW) - 'updated_at' - 'updated_by') THEN
    RETURN NEW;
  END IF;

  v_action := nullif(pg_catalog.current_setting('app.rabbitech_settings_action', true), '');
  INSERT INTO rabbitech_private.site_settings_history(actor_user_id, action, before_state, after_state)
  VALUES (
    COALESCE(NEW.updated_by, auth.uid()),
    COALESCE(v_action, 'settings_updated'),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS rb_snapshot_rabbitech_settings_before_update ON public.rabbitech_site_settings;
CREATE TRIGGER rb_snapshot_rabbitech_settings_before_update
BEFORE UPDATE ON public.rabbitech_site_settings
FOR EACH ROW EXECUTE FUNCTION public.rb_snapshot_rabbitech_settings();

INSERT INTO rabbitech_private.site_settings_history(actor_user_id, action, before_state, after_state)
SELECT NULL, 'baseline_before_operations_tools', NULL, to_jsonb(s)
FROM public.rabbitech_site_settings s
WHERE s.id = true
  AND NOT EXISTS (SELECT 1 FROM rabbitech_private.site_settings_history);

CREATE OR REPLACE FUNCTION public.get_rabbitech_public_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'notice_text', CASE WHEN btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at
       THEN s.scheduled_notice_text ELSE s.notice_text END,
    'notice_active', CASE WHEN btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at
       THEN true ELSE s.notice_active END,
    'notice_type', CASE WHEN btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at
       THEN s.scheduled_notice_type ELSE s.notice_type END,
    'accent_color', s.accent_color,
    'theme_name', s.theme_name,
    'feature_flags', coalesce(s.feature_flags, '{"public_ranking":true,"youtube_tv":true,"music_player":true,"global_notices":true,"strategy":true,"routes":true,"rules":true}'::jsonb),
    'updated_at', s.updated_at,
    'maintenance_mode', s.maintenance_mode,
    'maintenance_message', s.maintenance_message,
    'scheduled_notice_text', s.scheduled_notice_text,
    'scheduled_notice_type', s.scheduled_notice_type,
    'scheduled_notice_start_at', s.scheduled_notice_start_at,
    'scheduled_notice_end_at', s.scheduled_notice_end_at,
    'scheduled_notice_is_active', (btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at)
  )
  FROM public.rabbitech_site_settings s
  WHERE s.id = true;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_rabbitech_operations_settings(
  p_maintenance_mode boolean,
  p_maintenance_message text,
  p_scheduled_notice_text text,
  p_scheduled_notice_type text,
  p_scheduled_notice_start_at timestamptz,
  p_scheduled_notice_end_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_message text := left(btrim(coalesce(p_maintenance_message, '')), 500);
  v_notice text := left(btrim(coalesce(p_scheduled_notice_text, '')), 500);
  v_type text := coalesce(p_scheduled_notice_type, 'info');
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Somente o proprietário pode alterar manutenção e avisos agendados.' USING errcode = '42501';
  END IF;
  IF v_type NOT IN ('info','success','warning') THEN
    RAISE EXCEPTION 'Tipo de aviso agendado inválido.' USING errcode = '22023';
  END IF;
  IF v_notice <> '' AND (p_scheduled_notice_start_at IS NULL OR p_scheduled_notice_end_at IS NULL
      OR p_scheduled_notice_end_at <= p_scheduled_notice_start_at) THEN
    RAISE EXCEPTION 'Informe um início e um fim válidos para a notificação agendada.' USING errcode = '22023';
  END IF;
  IF coalesce(p_maintenance_mode,false) AND v_message = '' THEN
    v_message := 'O Rabbitech está em manutenção programada. Voltaremos em breve.';
  END IF;

  PERFORM pg_catalog.set_config('app.rabbitech_settings_action','operations_settings_updated',true);
  UPDATE public.rabbitech_site_settings
  SET maintenance_mode = coalesce(p_maintenance_mode,false),
      maintenance_message = CASE WHEN v_message = '' THEN 'O Rabbitech está em manutenção programada. Voltaremos em breve.' ELSE v_message END,
      scheduled_notice_text = v_notice,
      scheduled_notice_type = v_type,
      scheduled_notice_start_at = CASE WHEN v_notice = '' THEN NULL ELSE p_scheduled_notice_start_at END,
      scheduled_notice_end_at = CASE WHEN v_notice = '' THEN NULL ELSE p_scheduled_notice_end_at END,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = true
    AND (
      maintenance_mode IS DISTINCT FROM coalesce(p_maintenance_mode,false)
      OR maintenance_message IS DISTINCT FROM CASE WHEN v_message = '' THEN 'O Rabbitech está em manutenção programada. Voltaremos em breve.' ELSE v_message END
      OR scheduled_notice_text IS DISTINCT FROM v_notice
      OR scheduled_notice_type IS DISTINCT FROM v_type
      OR scheduled_notice_start_at IS DISTINCT FROM CASE WHEN v_notice = '' THEN NULL ELSE p_scheduled_notice_start_at END
      OR scheduled_notice_end_at IS DISTINCT FROM CASE WHEN v_notice = '' THEN NULL ELSE p_scheduled_notice_end_at END
    );
  RETURN public.get_rabbitech_public_settings();
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_rabbitech_settings_history(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Histórico e restauração são exclusivos do proprietário.' USING errcode = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC),'[]'::jsonb)
  INTO v_result
  FROM (
    SELECT id, actor_user_id, action, before_state, after_state, created_at
    FROM rabbitech_private.site_settings_history
    ORDER BY created_at DESC
    LIMIT greatest(1,least(coalesce(p_limit,20),50))
  ) q;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_rabbitech_settings_history(
  p_history_id bigint,
  p_confirmation_phrase text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE v_snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Restauração exclusiva do proprietário.' USING errcode = '42501';
  END IF;
  IF p_confirmation_phrase IS DISTINCT FROM 'RESTAURAR CONFIGURAÇÕES' THEN
    RAISE EXCEPTION 'Digite RESTAURAR CONFIGURAÇÕES para confirmar.' USING errcode = '22023';
  END IF;
  SELECT after_state INTO v_snapshot
  FROM rabbitech_private.site_settings_history
  WHERE id = p_history_id;
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Snapshot não encontrado ou sem estado restaurável.' USING errcode = '22023';
  END IF;

  PERFORM pg_catalog.set_config('app.rabbitech_settings_action','restored_from_snapshot:' || p_history_id::text,true);
  UPDATE public.rabbitech_site_settings
  SET notice_text = coalesce(v_snapshot->>'notice_text',''),
      notice_active = coalesce((v_snapshot->>'notice_active')::boolean,false),
      notice_type = coalesce(v_snapshot->>'notice_type','info'),
      accent_color = coalesce(v_snapshot->>'accent_color','#d0f477'),
      theme_name = coalesce(v_snapshot->>'theme_name','BioGlow Verde'),
      feature_flags = coalesce(v_snapshot->'feature_flags','{"public_ranking":true,"youtube_tv":true,"music_player":true,"global_notices":true,"strategy":true,"routes":true,"rules":true}'::jsonb),
      maintenance_mode = coalesce((v_snapshot->>'maintenance_mode')::boolean,false),
      maintenance_message = coalesce(v_snapshot->>'maintenance_message','O Rabbitech está em manutenção programada. Voltaremos em breve.'),
      scheduled_notice_text = coalesce(v_snapshot->>'scheduled_notice_text',''),
      scheduled_notice_type = coalesce(v_snapshot->>'scheduled_notice_type','info'),
      scheduled_notice_start_at = nullif(v_snapshot->>'scheduled_notice_start_at','')::timestamptz,
      scheduled_notice_end_at = nullif(v_snapshot->>'scheduled_notice_end_at','')::timestamptz,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = true;

  RETURN jsonb_build_object('ok',true,'restored_history_id',p_history_id,'settings',public.get_rabbitech_public_settings());
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_rabbitech_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_settings public.rabbitech_site_settings%ROWTYPE;
  v_team_count integer := 0;
  v_round_count integer := 0;
  v_orphan_rounds integer := 0;
  v_duplicate_names integer := 0;
  v_admin_count integer := 0;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Monitor de saúde disponível somente a administradores autenticados.' USING errcode = '42501';
  END IF;

  IF to_regclass('public.teams') IS NULL THEN v_missing := array_append(v_missing,'public.teams'); ELSE SELECT count(*) INTO v_team_count FROM public.teams; END IF;
  IF to_regclass('public.rounds') IS NULL THEN v_missing := array_append(v_missing,'public.rounds'); ELSE SELECT count(*) INTO v_round_count FROM public.rounds; END IF;
  IF to_regclass('public.rabbitech_site_settings') IS NULL THEN v_missing := array_append(v_missing,'public.rabbitech_site_settings'); ELSE SELECT * INTO v_settings FROM public.rabbitech_site_settings WHERE id = true; END IF;
  SELECT count(*) INTO v_admin_count FROM public.app_admins;
  IF to_regclass('public.teams') IS NOT NULL THEN
    SELECT count(*) INTO v_duplicate_names FROM (
      SELECT lower(btrim(name)) FROM public.teams GROUP BY lower(btrim(name)) HAVING count(*) > 1
    ) d;
  END IF;
  IF to_regclass('public.rounds') IS NOT NULL AND to_regclass('public.teams') IS NOT NULL THEN
    SELECT count(*) INTO v_orphan_rounds FROM public.rounds r LEFT JOIN public.teams t ON t.id=r.team_id WHERE t.id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', cardinality(v_missing)=0 AND v_orphan_rounds=0,
    'critical_objects_missing', to_jsonb(v_missing),
    'teams_count', v_team_count,
    'rounds_count', v_round_count,
    'orphan_rounds', v_orphan_rounds,
    'duplicate_team_names', v_duplicate_names,
    'admin_count', v_admin_count,
    'owner_registered', EXISTS(SELECT 1 FROM public.app_admins a WHERE a.user_id='7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid),
    'maintenance_mode', coalesce(v_settings.maintenance_mode,false),
    'active_notice', coalesce(v_settings.notice_active,false),
    'notice_module_enabled', coalesce(v_settings.feature_flags->>'global_notices','true')::boolean,
    'settings_history_available', to_regclass('rabbitech_private.site_settings_history') IS NOT NULL
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_rabbitech_operations_settings(boolean,text,text,text,timestamptz,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_rabbitech_settings_history(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_rabbitech_settings_history(bigint,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_rabbitech_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_rabbitech_operations_settings(boolean,text,text,text,timestamptz,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_rabbitech_settings_history(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_rabbitech_settings_history(bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rabbitech_system_health() TO authenticated;
