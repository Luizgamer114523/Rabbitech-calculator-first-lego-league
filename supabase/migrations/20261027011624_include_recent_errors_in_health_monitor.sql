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
  v_recent_sql_errors integer := 0;
  v_last_sql_error timestamptz;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Monitor de saúde disponível somente a administradores autenticados.' USING errcode = '42501';
  END IF;

  IF to_regclass('public.teams') IS NULL THEN
    v_missing := array_append(v_missing,'public.teams');
  ELSE
    SELECT count(*) INTO v_team_count FROM public.teams;
  END IF;

  IF to_regclass('public.rounds') IS NULL THEN
    v_missing := array_append(v_missing,'public.rounds');
  ELSE
    SELECT count(*) INTO v_round_count FROM public.rounds;
  END IF;

  IF to_regclass('public.rabbitech_site_settings') IS NULL THEN
    v_missing := array_append(v_missing,'public.rabbitech_site_settings');
  ELSE
    SELECT * INTO v_settings FROM public.rabbitech_site_settings WHERE id = true;
  END IF;

  SELECT count(*) INTO v_admin_count FROM public.app_admins;

  IF to_regclass('public.teams') IS NOT NULL THEN
    SELECT count(*) INTO v_duplicate_names
    FROM (SELECT lower(btrim(name)) FROM public.teams GROUP BY lower(btrim(name)) HAVING count(*) > 1) d;
  END IF;

  IF to_regclass('public.rounds') IS NOT NULL AND to_regclass('public.teams') IS NOT NULL THEN
    SELECT count(*) INTO v_orphan_rounds
    FROM public.rounds r LEFT JOIN public.teams t ON t.id = r.team_id
    WHERE t.id IS NULL;
  END IF;

  IF to_regclass('rabbitech_private.sql_console_audit') IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE success = false),
           max(created_at) FILTER (WHERE success = false)
    INTO v_recent_sql_errors, v_last_sql_error
    FROM rabbitech_private.sql_console_audit
    WHERE created_at >= now() - interval '24 hours';
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
    'settings_history_available', to_regclass('rabbitech_private.site_settings_history') IS NOT NULL,
    'recent_sql_errors_24h', coalesce(v_recent_sql_errors,0),
    'last_sql_error_at', v_last_sql_error
  );
END;
$function$;
