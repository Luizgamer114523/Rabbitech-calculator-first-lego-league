
CREATE OR REPLACE FUNCTION public.rb_audit_site_settings_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_changes jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_action text := 'site_settings_updated';
  v_actor uuid;
BEGIN
  IF OLD.notice_text IS DISTINCT FROM NEW.notice_text THEN
    v_changes := v_changes || jsonb_build_object('notice_text', jsonb_build_object('before', OLD.notice_text, 'after', NEW.notice_text));
  END IF;
  IF OLD.notice_active IS DISTINCT FROM NEW.notice_active THEN
    v_changes := v_changes || jsonb_build_object('notice_active', jsonb_build_object('before', OLD.notice_active, 'after', NEW.notice_active));
  END IF;
  IF OLD.notice_type IS DISTINCT FROM NEW.notice_type THEN
    v_changes := v_changes || jsonb_build_object('notice_type', jsonb_build_object('before', OLD.notice_type, 'after', NEW.notice_type));
  END IF;
  IF OLD.accent_color IS DISTINCT FROM NEW.accent_color THEN
    v_changes := v_changes || jsonb_build_object('accent_color', jsonb_build_object('before', OLD.accent_color, 'after', NEW.accent_color));
  END IF;
  IF OLD.theme_name IS DISTINCT FROM NEW.theme_name THEN
    v_changes := v_changes || jsonb_build_object('theme_name', jsonb_build_object('before', OLD.theme_name, 'after', NEW.theme_name));
  END IF;
  IF OLD.feature_flags IS DISTINCT FROM NEW.feature_flags THEN
    v_changes := v_changes || jsonb_build_object('feature_flags', jsonb_build_object('before', OLD.feature_flags, 'after', NEW.feature_flags));
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(jsonb_agg(key), '[]'::jsonb)
    INTO v_changed_fields
    FROM jsonb_each(v_changes);

  IF (OLD.notice_text IS DISTINCT FROM NEW.notice_text)
     OR (OLD.notice_active IS DISTINCT FROM NEW.notice_active)
     OR (OLD.notice_type IS DISTINCT FROM NEW.notice_type) THEN
    v_action := 'global_notice_updated';
  ELSIF OLD.feature_flags IS DISTINCT FROM NEW.feature_flags THEN
    v_action := 'site_features_updated';
  ELSIF (OLD.accent_color IS DISTINCT FROM NEW.accent_color)
     OR (OLD.theme_name IS DISTINCT FROM NEW.theme_name) THEN
    v_action := 'site_appearance_updated';
  END IF;

  v_actor := coalesce(NEW.updated_by, auth.uid());

  INSERT INTO public.rabbitech_admin_audit_log(actor_user_id, action, details)
  VALUES (
    v_actor,
    v_action,
    jsonb_build_object(
      'changed_fields', v_changed_fields,
      'changes', v_changes,
      'changed_at', clock_timestamp()
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS rb_audit_site_settings_changes ON public.rabbitech_site_settings;
CREATE TRIGGER rb_audit_site_settings_changes
AFTER UPDATE ON public.rabbitech_site_settings
FOR EACH ROW
WHEN (
  OLD.notice_text IS DISTINCT FROM NEW.notice_text
  OR OLD.notice_active IS DISTINCT FROM NEW.notice_active
  OR OLD.notice_type IS DISTINCT FROM NEW.notice_type
  OR OLD.accent_color IS DISTINCT FROM NEW.accent_color
  OR OLD.theme_name IS DISTINCT FROM NEW.theme_name
  OR OLD.feature_flags IS DISTINCT FROM NEW.feature_flags
)
EXECUTE FUNCTION public.rb_audit_site_settings_changes();
