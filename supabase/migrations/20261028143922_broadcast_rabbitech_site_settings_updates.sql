-- Broadcast a lightweight invalidation event for public site settings.
-- Clients re-fetch get_rabbitech_public_settings() rather than receiving row data,
-- so this does not expose settings columns through Realtime.
CREATE OR REPLACE FUNCTION public.broadcast_rabbitech_site_settings_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('updated_at', NEW.updated_at),
    'site_settings_updated',
    'public:site-settings',
    false
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.broadcast_rabbitech_site_settings_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rabbitech_site_settings_realtime_broadcast ON public.rabbitech_site_settings;
CREATE TRIGGER rabbitech_site_settings_realtime_broadcast
AFTER UPDATE ON public.rabbitech_site_settings
FOR EACH ROW
WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at)
EXECUTE FUNCTION public.broadcast_rabbitech_site_settings_update();
