CREATE OR REPLACE FUNCTION public.owner_set_rabbitech_youtube_api_key(p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.rb_is_owner() THEN
    RAISE EXCEPTION 'Somente o proprietário pode configurar a API do YouTube.';
  END IF;
  IF p_api_key IS NULL OR length(btrim(p_api_key)) < 20 OR length(btrim(p_api_key)) > 300 THEN
    RAISE EXCEPTION 'A chave da API parece inválida ou incompleta.';
  END IF;
  DELETE FROM public.rabbitech_private_secrets WHERE secret_name = 'youtube_data_api_v3';
  INSERT INTO public.rabbitech_private_secrets (secret_name, secret_value)
  VALUES ('youtube_data_api_v3', btrim(p_api_key));
  RETURN jsonb_build_object('ok', true, 'saved', true);
END;
$$;
REVOKE ALL ON FUNCTION public.owner_set_rabbitech_youtube_api_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_set_rabbitech_youtube_api_key(text) TO authenticated;
GRANT SELECT ON TABLE public.rabbitech_private_secrets TO service_role;