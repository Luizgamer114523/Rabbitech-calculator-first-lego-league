CREATE OR REPLACE FUNCTION public.rb_audit_site_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Do not create an audit event for UPDATEs that only refresh updated_at/updated_by.
  -- Compare all user-facing settings, including notice text and feature flags.
  IF OLD.notice_text IS NOT DISTINCT FROM NEW.notice_text
     AND OLD.notice_active IS NOT DISTINCT FROM NEW.notice_active
     AND OLD.notice_type IS NOT DISTINCT FROM NEW.notice_type
     AND OLD.accent_color IS NOT DISTINCT FROM NEW.accent_color
     AND OLD.theme_name IS NOT DISTINCT FROM NEW.theme_name
     AND OLD.feature_flags IS NOT DISTINCT FROM NEW.feature_flags THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.rabbitech_admin_audit_log(actor_user_id, action, details)
  VALUES (
    COALESCE(NEW.updated_by, auth.uid()),
    'site_settings_updated',
    jsonb_build_object(
      'theme_name', NEW.theme_name,
      'accent_color', NEW.accent_color,
      'notice_active', NEW.notice_active,
      'notice_type', NEW.notice_type,
      'notice_text_changed', OLD.notice_text IS DISTINCT FROM NEW.notice_text,
      'feature_flags_changed', OLD.feature_flags IS DISTINCT FROM NEW.feature_flags
    )
  );

  RETURN NEW;
END;
$function$;

-- Keep audit data intact. Prevent duplicate no-op writes at the common RPC entry points too.
CREATE OR REPLACE FUNCTION public.admin_update_rabbitech_settings(
  p_notice_text text,
  p_notice_active boolean,
  p_notice_type text,
  p_accent_color text,
  p_theme_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_notice text := left(coalesce(p_notice_text, ''), 500);
  v_color text := coalesce(p_accent_color, '#d0f477');
  v_type text := coalesce(p_notice_type, 'info');
  v_theme text := left(btrim(coalesce(p_theme_name, '')), 40);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado.' USING errcode = '42501';
  END IF;

  IF v_type NOT IN ('info', 'success', 'warning') THEN
    RAISE EXCEPTION 'Tipo de aviso inválido.';
  END IF;
  IF v_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor inválida.';
  END IF;

  UPDATE public.rabbitech_site_settings
  SET notice_text = v_notice,
      notice_active = coalesce(p_notice_active, false),
      notice_type = v_type,
      accent_color = v_color,
      theme_name = v_theme,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = true
    AND (
      notice_text IS DISTINCT FROM v_notice
      OR notice_active IS DISTINCT FROM coalesce(p_notice_active, false)
      OR notice_type IS DISTINCT FROM v_type
      OR accent_color IS DISTINCT FROM v_color
      OR theme_name IS DISTINCT FROM v_theme
    );

  RETURN public.get_rabbitech_public_settings();
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_rabbitech_feature_flags(p_feature_flags jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_flags jsonb;
  v_allowed text[] := ARRAY['public_ranking','youtube_tv','music_player','global_notices','strategy','routes','rules'];
  v_key text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado.' USING errcode = '42501';
  END IF;

  IF jsonb_typeof(coalesce(p_feature_flags, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'As configurações de módulos devem ser um objeto JSON.';
  END IF;

  SELECT coalesce(feature_flags, '{}'::jsonb)
  INTO v_flags
  FROM public.rabbitech_site_settings
  WHERE id = true;

  FOREACH v_key IN ARRAY v_allowed LOOP
    IF p_feature_flags ? v_key THEN
      IF jsonb_typeof(p_feature_flags -> v_key) <> 'boolean' THEN
        RAISE EXCEPTION 'Valor inválido para o módulo %.', v_key;
      END IF;
      v_flags := jsonb_set(v_flags, ARRAY[v_key], p_feature_flags -> v_key, true);
    END IF;
  END LOOP;

  UPDATE public.rabbitech_site_settings
  SET feature_flags = v_flags,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = true
    AND feature_flags IS DISTINCT FROM v_flags;

  RETURN public.get_rabbitech_public_settings();
END;
$function$;