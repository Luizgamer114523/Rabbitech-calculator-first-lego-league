
create table if not exists public.rabbitech_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  action text not null,
  target_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.rabbitech_admin_audit_log enable row level security;
revoke all on public.rabbitech_admin_audit_log from anon, authenticated;
grant select on public.rabbitech_admin_audit_log to authenticated;

create or replace function public.admin_list_rabbitech_admins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v jsonb;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'Somente o proprietário pode gerenciar administradores.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email, 'created_at', a.created_at) order by u.email), '[]'::jsonb)
    into v
    from public.app_admins a
    left join auth.users u on u.id = a.user_id;
  return v;
end;
$function$;

create or replace function public.admin_add_rabbitech_admin_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_target_user_id uuid; v_email text; v_added boolean := false;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'Somente o proprietário pode adicionar administradores.' using errcode = '42501';
  end if;
  v_email := lower(btrim(coalesce(p_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Endereço de e-mail inválido.' using errcode = '22023';
  end if;
  select u.id into v_target_user_id from auth.users u where lower(u.email) = v_email limit 1;
  if v_target_user_id is null then
    raise exception 'Esta conta ainda não está cadastrada no site. Entre com ela primeiro.' using errcode = 'P0002';
  end if;
  insert into public.app_admins(user_id) values (v_target_user_id) on conflict (user_id) do nothing;
  get diagnostics v_added = row_count;
  if v_added then
    insert into public.rabbitech_admin_audit_log(actor_user_id, action, target_user_id, details)
    values (auth.uid(), 'admin_added', v_target_user_id, jsonb_build_object('email', v_email));
  end if;
  return jsonb_build_object('ok', true, 'already_admin', not v_added, 'message', case when v_added then 'Administrador adicionado com sucesso.' else 'Esta conta já era administradora.' end, 'user_id', v_target_user_id);
end;
$function$;

create or replace function public.admin_remove_rabbitech_admin(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_count integer; v_email text;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'Somente o proprietário pode remover administradores.' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception 'Selecione um administrador válido.' using errcode = '22023'; end if;
  if p_user_id = '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'A conta do proprietário não pode ser removida.' using errcode = '42501';
  end if;
  select count(*) into v_count from public.app_admins;
  if v_count <= 1 then raise exception 'Não é permitido remover o último administrador.'; end if;
  select lower(u.email) into v_email from auth.users u where u.id = p_user_id;
  delete from public.app_admins where user_id = p_user_id;
  if not found then raise exception 'Administrador não encontrado.'; end if;
  insert into public.rabbitech_admin_audit_log(actor_user_id, action, target_user_id, details)
  values (auth.uid(), 'admin_removed', p_user_id, jsonb_build_object('email', v_email));
  return jsonb_build_object('ok', true, 'removed_user_id', p_user_id);
end;
$function$;

create or replace function public.get_rabbitech_admin_audit_log(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare v jsonb;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'Somente o proprietário pode consultar o histórico administrativo.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v
  from (
    select l.id, l.actor_user_id, au.email as actor_email, l.action, l.target_user_id,
           tu.email as target_email, l.details, l.created_at
    from public.rabbitech_admin_audit_log l
    left join auth.users au on au.id = l.actor_user_id
    left join auth.users tu on tu.id = l.target_user_id
    order by l.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) x;
  return v;
end;
$function$;

revoke all on function public.admin_list_rabbitech_admins() from public, anon;
revoke all on function public.admin_add_rabbitech_admin_by_email(text) from public, anon;
revoke all on function public.admin_remove_rabbitech_admin(uuid) from public, anon;
revoke all on function public.get_rabbitech_admin_audit_log(integer) from public, anon;
grant execute on function public.admin_list_rabbitech_admins() to authenticated;
grant execute on function public.admin_add_rabbitech_admin_by_email(text) to authenticated;
grant execute on function public.admin_remove_rabbitech_admin(uuid) to authenticated;
grant execute on function public.get_rabbitech_admin_audit_log(integer) to authenticated;
