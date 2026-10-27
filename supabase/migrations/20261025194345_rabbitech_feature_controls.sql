alter table public.rabbitech_site_settings
  add column if not exists feature_flags jsonb not null default '{"public_ranking":true,"youtube_tv":true,"music_player":true,"global_notices":true,"strategy":true,"routes":true,"rules":true}'::jsonb;

create or replace function public.get_rabbitech_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'notice_text', notice_text,
    'notice_active', notice_active,
    'notice_type', notice_type,
    'accent_color', accent_color,
    'theme_name', theme_name,
    'feature_flags', coalesce(feature_flags, '{"public_ranking":true,"youtube_tv":true,"music_player":true,"global_notices":true,"strategy":true,"routes":true,"rules":true}'::jsonb),
    'updated_at', updated_at
  )
  from public.rabbitech_site_settings where id = true;
$function$;

create or replace function public.admin_update_rabbitech_feature_flags(p_feature_flags jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_flags jsonb;
  v_allowed text[] := array['public_ranking','youtube_tv','music_player','global_notices','strategy','routes','rules'];
  v_key text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo não autorizado.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_feature_flags, '{}'::jsonb)) <> 'object' then
    raise exception 'As configurações de módulos devem ser um objeto JSON.';
  end if;

  v_flags := coalesce((select feature_flags from public.rabbitech_site_settings where id = true), '{}'::jsonb);
  foreach v_key in array v_allowed loop
    if p_feature_flags ? v_key then
      if jsonb_typeof(p_feature_flags -> v_key) <> 'boolean' then
        raise exception 'Valor inválido para o módulo %.', v_key;
      end if;
      v_flags := jsonb_set(v_flags, array[v_key], p_feature_flags -> v_key, true);
    end if;
  end loop;

  update public.rabbitech_site_settings
  set feature_flags = v_flags, updated_at = now(), updated_by = auth.uid()
  where id = true;

  return public.get_rabbitech_public_settings();
end;
$function$;

revoke all on function public.admin_update_rabbitech_feature_flags(jsonb) from public, anon;
grant execute on function public.admin_update_rabbitech_feature_flags(jsonb) to authenticated;
grant execute on function public.get_rabbitech_public_settings() to anon, authenticated;