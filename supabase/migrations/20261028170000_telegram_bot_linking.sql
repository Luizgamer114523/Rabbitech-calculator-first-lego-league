-- Telegram account linking for Rabbitech.
-- The bot token never enters the browser; only one-time hashes are stored in the database.

CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_link_codes_user_created_idx
  ON public.telegram_link_codes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.telegram_user_links (
  telegram_user_id bigint PRIMARY KEY,
  chat_id bigint NOT NULL,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  first_name text,
  linked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_user_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telegram_link_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.telegram_user_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_link_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_user_links TO service_role;

CREATE OR REPLACE FUNCTION public.create_telegram_link_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta do Rabbitech primeiro.' USING errcode = '42501';
  END IF;

  v_code := encode(extensions.gen_random_bytes(24), 'hex');

  DELETE FROM public.telegram_link_codes
   WHERE user_id = auth.uid()
     AND consumed_at IS NULL;

  INSERT INTO public.telegram_link_codes(code_hash, user_id, expires_at)
  VALUES (
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    auth.uid(),
    now() + interval '10 minutes'
  );

  RETURN v_code;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_telegram_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_telegram_link_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_telegram_link(
  p_code_hash text,
  p_telegram_user_id bigint,
  p_chat_id bigint,
  p_username text DEFAULT NULL,
  p_first_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_link public.telegram_link_codes%ROWTYPE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso não autorizado.' USING errcode = '42501';
  END IF;
  IF p_code_hash IS NULL OR length(p_code_hash) <> 64
     OR p_telegram_user_id IS NULL OR p_chat_id IS NULL THEN
    RAISE EXCEPTION 'Dados de vínculo inválidos.' USING errcode = '22023';
  END IF;

  SELECT * INTO v_link
    FROM public.telegram_link_codes
   WHERE code_hash = lower(p_code_hash)
     AND consumed_at IS NULL
     AND expires_at > now()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido ou expirado. Gere outro no Rabbitech.' USING errcode = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.telegram_user_links WHERE telegram_user_id = p_telegram_user_id) THEN
    RAISE EXCEPTION 'Esta conta do Telegram já está vinculada a um usuário Rabbitech.' USING errcode = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.telegram_user_links WHERE user_id = v_link.user_id) THEN
    RAISE EXCEPTION 'Esta conta Rabbitech já possui um Telegram vinculado.' USING errcode = '23505';
  END IF;

  INSERT INTO public.telegram_user_links(telegram_user_id, chat_id, user_id, username, first_name)
  VALUES (p_telegram_user_id, p_chat_id, v_link.user_id,
          left(nullif(p_username, ''), 64), left(nullif(p_first_name, ''), 120));

  UPDATE public.telegram_link_codes
     SET consumed_at = now()
   WHERE code_hash = v_link.code_hash;

  RETURN jsonb_build_object('linked', true, 'user_id', v_link.user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_telegram_link(text, bigint, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telegram_link(text, bigint, bigint, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.unlink_telegram_account(p_telegram_user_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso não autorizado.' USING errcode = '42501';
  END IF;
  DELETE FROM public.telegram_user_links WHERE telegram_user_id = p_telegram_user_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.unlink_telegram_account(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_account(bigint) TO service_role;
