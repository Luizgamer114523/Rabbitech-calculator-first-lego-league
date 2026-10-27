
CREATE OR REPLACE FUNCTION public.get_rabbitech_admin_audit_log(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid THEN
    RAISE EXCEPTION 'Somente o proprietário pode consultar o histórico administrativo.' USING errcode = '42501';
  END IF;

  WITH recent_events AS (
    SELECT l.id, l.actor_user_id, au.email AS actor_email, l.action, l.target_user_id,
           tu.email AS target_email, l.details, l.created_at
    FROM public.rabbitech_admin_audit_log l
    LEFT JOIN auth.users au ON au.id = l.actor_user_id
    LEFT JOIN auth.users tu ON tu.id = l.target_user_id
    WHERE l.action <> 'site_settings_updated'
    ORDER BY l.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 50), 200))
  ),
  legacy_summary AS (
    SELECT
      min(l.id) AS id,
      NULL::uuid AS actor_user_id,
      NULL::text AS actor_email,
      'site_settings_updates_summarized'::text AS action,
      NULL::uuid AS target_user_id,
      NULL::text AS target_email,
      jsonb_build_object(
        'archived_entries', count(*),
        'note', 'Registros antigos de atualização automática foram agrupados para reduzir ruído. Os registros individuais continuam preservados no banco.',
        'first_seen', min(l.created_at),
        'last_seen', max(l.created_at)
      ) AS details,
      max(l.created_at) AS created_at
    FROM public.rabbitech_admin_audit_log l
    WHERE l.action = 'site_settings_updated'
    HAVING count(*) > 0
  ),
  combined AS (
    SELECT * FROM recent_events
    UNION ALL
    SELECT * FROM legacy_summary
  )
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v
    FROM combined x;

  RETURN v;
END;
$function$;
