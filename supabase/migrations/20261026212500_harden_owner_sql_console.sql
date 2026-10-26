-- Rabbitech BIOGLOW: harden owner-only SQL console and private audit.
-- The equivalent changes were validated against production project ieijssfqonoucqheedac.
ALTER TABLE rabbitech_private.sql_console_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA rabbitech_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE rabbitech_private.sql_console_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA rabbitech_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rabbitech_owner_sql_console(
  p_sql text,
  p_confirm_destructive boolean DEFAULT false,
  p_confirmation_phrase text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '8s'
SET lock_timeout = '2s'
AS $function$
DECLARE
  v_sql text := btrim(coalesce(p_sql, ''));
  v_upper text;
  v_kind text := 'UNKNOWN';
  v_row record;
  v_rows jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_destructive boolean := false;
  v_started timestamptz := clock_timestamp();
  v_error text;
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Console SQL disponível somente para a conta proprietária autenticada.' USING errcode = '42501';
  END IF;

  BEGIN
    IF v_sql = '' OR length(v_sql) > 12000 THEN
      RAISE EXCEPTION 'Informe um comando SQL de até 12.000 caracteres.' USING errcode = '22023';
    END IF;

    v_sql := regexp_replace(v_sql, ';[[:space:]]*$', '');
    IF position(';' IN v_sql) > 0
       OR position('--' IN v_sql) > 0
       OR position('/*' IN v_sql) > 0
       OR position('*/' IN v_sql) > 0 THEN
      RAISE EXCEPTION 'Execute uma única instrução, sem comentários SQL nem múltiplas instruções.' USING errcode = '22023';
    END IF;

    v_upper := upper(v_sql);
    v_kind := coalesce(substring(v_upper FROM '^[[:space:]]*([A-Z]+)'), 'UNKNOWN');

    IF v_upper ~ '(^|[^A-Z0-9_])(COPY|DO|CALL|GRANT|REVOKE|SECURITY[[:space:]]+DEFINER|CREATE[[:space:]]+(FUNCTION|PROCEDURE|TRIGGER|EXTENSION|ROLE|USER|SCHEMA)|DROP[[:space:]]+(FUNCTION|PROCEDURE|TRIGGER|EXTENSION|ROLE|USER|SCHEMA|DATABASE)|ALTER[[:space:]]+(ROLE|USER|SYSTEM|DATABASE|FUNCTION|PROCEDURE|SCHEMA)|SET[[:space:]]+(ROLE|SESSION|CONFIGURATION)|RESET|VACUUM|ANALYZE|LISTEN|NOTIFY|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*|SET_CONFIG|CURRENT_SETTING)([^A-Z0-9_]|$)' THEN
      RAISE EXCEPTION 'Comando ou função privilegiada bloqueada pelo console seguro.' USING errcode = '42501';
    END IF;

    IF v_upper ~ '(^|[^A-Z0-9_])(AUTH|STORAGE|PG_CATALOG|INFORMATION_SCHEMA|RABBITECH_PRIVATE|RABBITECH_PRIVATE_SECRETS|SQL_CONSOLE_AUDIT)[[:space:]]*[.]'
       OR v_upper ~ '(^|[^A-Z0-9_])(RABBITECH_PRIVATE_SECRETS|SQL_CONSOLE_AUDIT)([^A-Z0-9_]|$)' THEN
      RAISE EXCEPTION 'O console não permite acessar schemas internos, segredos ou a própria auditoria.' USING errcode = '42501';
    END IF;

    IF v_kind IN ('SELECT', 'WITH') THEN
      IF v_upper ~ '(^|[^A-Z0-9_])(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|INTO)([^A-Z0-9_]|$)' THEN
        RAISE EXCEPTION 'Consultas somente leitura não podem conter operações de escrita nem SELECT INTO.' USING errcode = '42501';
      END IF;

      IF v_sql ~* '[A-Za-z_][A-Za-z0-9_.]*[[:space:]]*[(]' THEN
        IF regexp_replace(
          v_sql,
          '(^|[^A-Za-z0-9_])(count|sum|avg|min|max|coalesce|nullif|lower|upper|trim|ltrim|rtrim|length|char_length|substring|round|floor|ceil|date_trunc|extract|to_char|to_date|to_timestamp|json_build_object|jsonb_build_object|json_agg|jsonb_agg|string_agg|array_agg|bool_and|bool_or|greatest|least|concat|replace|regexp_replace|now|gen_random_uuid|md5|encode|decode)[[:space:]]*[(]',
          '',
          'gi'
        ) ~* '[A-Za-z_][A-Za-z0-9_.]*[[:space:]]*[(]' THEN
          RAISE EXCEPTION 'A consulta contém chamada de função não permitida.' USING errcode = '42501';
        END IF;
      END IF;
      v_kind := 'SELECT';

    ELSIF v_kind IN ('INSERT', 'UPDATE', 'DELETE') THEN
      v_destructive := true;
      IF v_sql !~* '^[[:space:]]*(INSERT[[:space:]]+INTO|UPDATE|DELETE[[:space:]]+FROM)[[:space:]]+(public[.])?[A-Za-z_][A-Za-z0-9_]*([[:space:]]|[(]|$)' THEN
        RAISE EXCEPTION 'Escritas só são permitidas em tabelas do schema public.' USING errcode = '42501';
      END IF;

    ELSIF v_kind IN ('CREATE', 'ALTER', 'DROP', 'TRUNCATE') THEN
      v_destructive := true;
      IF v_sql !~* '^[[:space:]]*(CREATE[[:space:]]+TABLE|ALTER[[:space:]]+TABLE|DROP[[:space:]]+TABLE|TRUNCATE([[:space:]]+TABLE)?)[[:space:]]+(IF[[:space:]]+(NOT[[:space:]]+)?EXISTS[[:space:]]+)?(public[.])?[A-Za-z_][A-Za-z0-9_]*([[:space:]]|[(]|$)' THEN
        RAISE EXCEPTION 'DDL limitado a CREATE/ALTER/DROP/TRUNCATE TABLE no schema public.' USING errcode = '42501';
      END IF;

    ELSE
      RAISE EXCEPTION 'Comando não permitido. Use SELECT, INSERT, UPDATE, DELETE ou DDL limitado a tabelas public.' USING errcode = '22023';
    END IF;

    IF v_destructive
       AND (p_confirm_destructive IS DISTINCT FROM true
            OR p_confirmation_phrase IS DISTINCT FROM 'CONFIRMAR ALTERAÇÃO') THEN
      RAISE EXCEPTION 'Operação de escrita ou destrutiva requer a confirmação CONFIRMAR ALTERAÇÃO.' USING errcode = '22023';
    END IF;

    IF v_kind = 'SELECT' THEN
      FOR v_row IN EXECUTE v_sql LOOP
        v_count := v_count + 1;
        IF v_count <= 200 THEN
          v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
        END IF;
        IF v_count >= 1000 THEN
          EXIT;
        END IF;
      END LOOP;
    ELSIF v_kind IN ('INSERT', 'UPDATE', 'DELETE') AND v_upper ~ '(^|[^A-Z0-9_])RETURNING([^A-Z0-9_]|$)' THEN
      FOR v_row IN EXECUTE v_sql LOOP
        v_count := v_count + 1;
        IF v_count <= 200 THEN
          v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
        END IF;
        IF v_count >= 1000 THEN
          EXIT;
        END IF;
      END LOOP;
    ELSE
      EXECUTE v_sql;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    INSERT INTO rabbitech_private.sql_console_audit(actor_user_id, sql_text, command_kind, success, row_count, result_preview)
    VALUES (auth.uid(), left(v_sql, 12000), v_kind, true, v_count, v_rows);

    RETURN jsonb_build_object(
      'ok', true,
      'command', v_kind,
      'row_count', v_count,
      'rows', v_rows,
      'truncated', v_count > 200,
      'duration_ms', floor(extract(epoch FROM (clock_timestamp() - v_started)) * 1000)
    );

  EXCEPTION WHEN OTHERS THEN
    v_error := left(SQLERRM, 1000);
    INSERT INTO rabbitech_private.sql_console_audit(actor_user_id, sql_text, command_kind, success, row_count, error_message)
    VALUES (auth.uid(), left(coalesce(v_sql, ''), 12000), coalesce(v_kind, 'UNKNOWN'), false, 0, v_error);

    RETURN jsonb_build_object(
      'ok', false,
      'command', coalesce(v_kind, 'UNKNOWN'),
      'error', v_error,
      'duration_ms', floor(extract(epoch FROM (clock_timestamp() - v_started)) * 1000)
    );
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rabbitech_owner_sql_console_logs(p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '4s'
SET lock_timeout = '2s'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Auditoria disponível somente para a conta proprietária autenticada.' USING errcode = '42501';
  END IF;

  SELECT coalesce(
    jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT id, actor_user_id, sql_text, command_kind, success, row_count, result_preview, error_message, created_at
    FROM rabbitech_private.sql_console_audit
    ORDER BY created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
  ) q;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.rabbitech_owner_sql_console(text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rabbitech_owner_sql_console_logs(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rabbitech_owner_sql_console(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rabbitech_owner_sql_console_logs(integer) TO authenticated;