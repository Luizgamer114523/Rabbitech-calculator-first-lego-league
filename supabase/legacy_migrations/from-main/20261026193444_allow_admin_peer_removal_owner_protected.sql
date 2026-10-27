CREATE OR REPLACE FUNCTION public.admin_remove_rabbitech_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_count integer; v_email text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso administrativo não autorizado.' USING errcode = '42501';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Selecione um administrador válido.' USING errcode = '22023'; END IF;
  IF p_user_id = '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid THEN
    RAISE EXCEPTION 'A conta proprietária não pode ser removida.' USING errcode = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso administrativo.' USING errcode = '42501';
  END IF;
  SELECT count(*) INTO v_count FROM public.app_admins;
  IF v_count <= 1 THEN RAISE EXCEPTION 'Não é permitido remover o último administrador.' USING errcode = '42501'; END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  DELETE FROM public.app_admins WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Administrador não encontrado.' USING errcode = 'P0002'; END IF;
  INSERT INTO public.rabbitech_admin_audit_log(actor_user_id, action, target_user_id, details)
    VALUES (auth.uid(), 'admin_removed', p_user_id, jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('ok', true, 'removed_user_id', p_user_id);
END;
$function$;
