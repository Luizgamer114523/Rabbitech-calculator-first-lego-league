
create or replace function public.rb_audit_site_settings_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.rabbitech_admin_audit_log(actor_user_id, action, details)
  values (
    coalesce(new.updated_by, auth.uid()),
    'site_settings_updated',
    jsonb_build_object(
      'theme_name', new.theme_name,
      'accent_color', new.accent_color,
      'notice_active', new.notice_active,
      'notice_type', new.notice_type
    )
  );
  return new;
end;
$function$;

drop trigger if exists rb_audit_site_settings_changes on public.rabbitech_site_settings;
create trigger rb_audit_site_settings_changes
after update on public.rabbitech_site_settings
for each row execute function public.rb_audit_site_settings_changes();

create or replace function public.get_rabbitech_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Acesso administrativo não autorizado.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'team_count', (select count(*) from public.teams),
    'round_count', (select count(*) from public.rounds),
    'admin_count', (select count(*) from public.app_admins),
    'settings_updated_at', (select s.updated_at from public.rabbitech_site_settings s where s.id = true),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'rounds_count', coalesce(stats.rounds_count, 0),
        'average_score', stats.average_score,
        'best_score', stats.best_score,
        'last_round_at', stats.last_round_at
      ) order by coalesce(stats.average_score, 0) desc, t.name asc)
      from public.teams t
      left join lateral (
        select count(*)::bigint as rounds_count,
          round(avg(r.score)::numeric, 1) as average_score,
          max(r.score) as best_score,
          max(r.created_at) as last_round_at
        from public.rounds r where r.team_id = t.id
      ) stats on true
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;
