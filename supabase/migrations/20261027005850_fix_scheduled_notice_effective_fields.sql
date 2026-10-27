CREATE OR REPLACE FUNCTION public.get_rabbitech_public_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    -- Raw/current values are kept for the owner form so a scheduled notice never overwrites the manual notice editor.
    'notice_text', s.notice_text,
    'notice_active', s.notice_active,
    'notice_type', s.notice_type,
    -- Effective display values are consumed by the public banner.
    'display_notice_text', CASE WHEN btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at
       THEN s.scheduled_notice_text ELSE s.notice_text END,
    'display_notice_active', CASE WHEN btrim(s.scheduled_notice_text) <> ''
       AND s.scheduled_notice_start_at IS NOT NULL AND s.scheduled_notice_end_at IS NOT NULL
       AND now() >= s.scheduled_notice_start_at AND now() < s.scheduled_notice_end_at
       THEN true ELSE s.notice_active END,
    'display_notice_type', CASE WHEN btrim(s.scheduled_notice_text) <> ''
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
