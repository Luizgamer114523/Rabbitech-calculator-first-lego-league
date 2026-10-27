create or replace function public.rb_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(auth.uid() = '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid, false);
$function$;

revoke all on function public.rb_is_owner() from public, anon;
grant execute on function public.rb_is_owner() to authenticated;

create or replace function public.admin_add_rabbitech_admin_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_target_user_id uuid;
  v_email text;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid then
    raise exception 'Somente o proprietário pode adicionar administradores.' using errcode = '42501';
  end if;

  v_email := lower(btrim(p_email));
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Endereço de e-mail inválido.' using errcode = '22023';
  end if;

  select u.id
    into v_target_user_id
    from auth.users u
   where lower(u.email) = v_email
   limit 1;

  if v_target_user_id is null then
    raise exception 'Esta conta ainda não está cadastrada no site. Entre com ela primeiro.' using errcode = 'P0002';
  end if;

  insert into public.app_admins(user_id)
  values (v_target_user_id)
  on conflict (user_id) do nothing;

  return jsonb_build_object('ok', true, 'message', 'Administrador adicionado com sucesso.', 'user_id', v_target_user_id);
end;
$function$;

revoke all on function public.admin_add_rabbitech_admin_by_email(text) from public, anon;
grant execute on function public.admin_add_rabbitech_admin_by_email(text) to authenticated;