CREATE OR REPLACE FUNCTION public.admin_list_rabbitech_admins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado.' USING errcode = '42501';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', a.user_id,
        'email', u.email,
        'created_at', a.created_at
      ) ORDER BY u.email
    ),
    '[]'::jsonb
  )
  INTO v
  FROM public.app_admins a
  LEFT JOIN auth.users u ON u.id = a.user_id;

  RETURN v;
END;
$function$;