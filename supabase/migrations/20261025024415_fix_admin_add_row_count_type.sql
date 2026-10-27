
create or replace function public.admin_add_rabbitech_admin_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_target_user_id uuid; v_email text; v_rows integer := 0; v_added boolean := false;
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
  get diagnostics v_rows = row_count;
  v_added := v_rows > 0;
  if v_added then
    insert into public.rabbitech_admin_audit_log(actor_user_id, action, target_user_id, details)
    values (auth.uid(), 'admin_added', v_target_user_id, jsonb_build_object('email', v_email));
  end if;
  return jsonb_build_object('ok', true, 'already_admin', not v_added, 'message', case when v_added then 'Administrador adicionado com sucesso.' else 'Esta conta já era administradora.' end, 'user_id', v_target_user_id);
end;
$function$;
