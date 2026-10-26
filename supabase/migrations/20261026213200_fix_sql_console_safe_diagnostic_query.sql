-- Keep the owner SQL console deliberately narrow. This wrapper validates the query
-- before calling the internal executor, which records successful and failed attempts.
CREATE OR REPLACE FUNCTION public.rabbitech_owner_sql_console(
  p_sql text, p_confirm_destructive boolean DEFAULT false, p_confirmation_phrase text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET statement_timeout = '8s' SET lock_timeout = '2s'
AS $function$
DECLARE
  v_sql text := btrim(coalesce(p_sql, ''));
  v_upper text;
  v_kind text := 'UNKNOWN';
  v_error text;
  v_started timestamptz := clock_timestamp();
  v_destructive boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     OR NOT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Console SQL disponível somente para a conta proprietária autenticada.' USING errcode = '42501';
  END IF;
  BEGIN
    IF v_sql = '' OR length(v_sql) > 12000 THEN
      RAISE EXCEPTION 'Informe um comando SQL de até 12.000 caracteres.' USING errcode = '22023';
    END IF;
    IF right(v_sql, 1) = ';' THEN v_sql := btrim(left(v_sql, length(v_sql) - 1)); END IF;
    IF position(';' IN v_sql) > 0 OR position('--' IN v_sql) > 0 OR position('/*' IN v_sql) > 0
       OR position('*/' IN v_sql) > 0 OR position('$' IN v_sql) > 0 THEN
      RAISE EXCEPTION 'Execute uma única instrução, sem comentários SQL, dollar-quoting ou múltiplas instruções.' USING errcode = '22023';
    END IF;
    v_upper := upper(v_sql);
    v_kind := coalesce(substring(v_upper FROM '^[[:space:]]*([A-Z]+)'), 'UNKNOWN');
    IF v_kind = 'SELECT' THEN
      IF v_sql ~* '^[[:space:]]*SELECT[[:space:]]+(''([^'']|'''')*''|[0-9]+|CURRENT_TIMESTAMP)([[:space:]]+AS[[:space:]]+[A-Za-z_][A-Za-z0-9_]*)?([[:space:]]*,[[:space:]]*(''([^'']|'''')*''|[0-9]+|CURRENT_TIMESTAMP)([[:space:]]+AS[[:space:]]+[A-Za-z_][A-Za-z0-9_]*)?)*[[:space:]]*$' THEN
        NULL;
      ELSIF v_sql ~* '^[[:space:]]*SELECT[[:space:]]+(\*|[A-Za-z_][A-Za-z0-9_]*([[:space:]]*,[[:space:]]*[A-Za-z_][A-Za-z0-9_]*)*)[[:space:]]+FROM[[:space:]]+public\.(teams|rounds|rabbitech_site_settings)([[:space:]]+WHERE[[:space:]]+[^();]+)?([[:space:]]+ORDER[[:space:]]+BY[[:space:]]+[A-Za-z_][A-Za-z0-9_]*([[:space:]]+(ASC|DESC))?)?([[:space:]]+LIMIT[[:space:]]+[0-9]{1,3})?([[:space:]]+OFFSET[[:space:]]+[0-9]{1,6})?[[:space:]]*$' THEN
        IF v_upper ~ '(^|[^A-Z0-9_])(WITH|UNION|INTERSECT|EXCEPT|INTO|JOIN|LATERAL|RETURNING|INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|CALL|DO|COPY|EXECUTE|SET_CONFIG|CURRENT_SETTING|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*)([^A-Z0-9_]|$)' THEN
          RAISE EXCEPTION 'A consulta contém uma palavra-chave bloqueada.' USING errcode = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'SELECT limitado a valores literais, current_timestamp ou tabelas aprovadas (teams, rounds e rabbitech_site_settings). Funções, JOINs e subconsultas são bloqueados.' USING errcode = '42501';
      END IF;
    ELSIF v_kind = 'UPDATE' THEN
      v_destructive := true;
      IF v_sql !~* '^UPDATE[[:space:]]+public\.(teams|rounds|rabbitech_site_settings)[[:space:]]+SET[[:space:]]+[^();]+[[:space:]]+WHERE[[:space:]]+[^();]+$'
         OR v_upper ~ '(^|[^A-Z0-9_])(FROM|USING|RETURNING|WITH|SELECT|INSERT|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|CALL|DO|COPY|EXECUTE|SET_CONFIG|CURRENT_SETTING|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*)([^A-Z0-9_]|$)' THEN
        RAISE EXCEPTION 'UPDATE só é permitido com WHERE em tabelas aprovadas; subconsultas, funções e RETURNING são bloqueados.' USING errcode = '42501';
      END IF;
    ELSIF v_kind = 'DELETE' THEN
      v_destructive := true;
      IF v_sql !~* '^DELETE[[:space:]]+FROM[[:space:]]+public\.(teams|rounds)[[:space:]]+WHERE[[:space:]]+[^();]+$'
         OR v_upper ~ '(^|[^A-Z0-9_])(USING|RETURNING|WITH|SELECT|INSERT|UPDATE|MERGE|CREATE|ALTER|DROP|TRUNCATE|CALL|DO|COPY|EXECUTE|SET_CONFIG|CURRENT_SETTING|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*)([^A-Z0-9_]|$)' THEN
        RAISE EXCEPTION 'DELETE só é permitido com WHERE em public.teams ou public.rounds; USING, subconsultas, funções e RETURNING são bloqueados.' USING errcode = '42501';
      END IF;
    ELSIF v_kind = 'INSERT' THEN
      v_destructive := true;
      IF v_sql !~* '^[[:space:]]*INSERT[[:space:]]+INTO[[:space:]]+public\.(teams|rounds)[[:space:]]*\([A-Za-z_,[:space:]]+\)[[:space:]]+VALUES[[:space:]]*\([^();]+\)[[:space:]]*$'
         OR v_upper ~ '(^|[^A-Z0-9_])(SELECT|WITH|RETURNING|ON|CONFLICT|CREATE|ALTER|DROP|TRUNCATE|CALL|DO|COPY|EXECUTE|SET_CONFIG|CURRENT_SETTING|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*)([^A-Z0-9_]|$)' THEN
        RAISE EXCEPTION 'INSERT limitado a uma linha literal em public.teams ou public.rounds. Funções, subconsultas, múltiplas linhas e ON CONFLICT são bloqueados.' USING errcode = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Comando bloqueado. Use SELECT seguro, INSERT de uma linha ou UPDATE/DELETE com WHERE. Mudanças estruturais exigem migrações revisadas.' USING errcode = '42501';
    END IF;
    IF v_destructive AND (p_confirm_destructive IS DISTINCT FROM true OR p_confirmation_phrase IS DISTINCT FROM 'CONFIRMAR ALTERAÇÃO') THEN
      RAISE EXCEPTION 'Operação de escrita requer a confirmação CONFIRMAR ALTERAÇÃO.' USING errcode = '22023';
    END IF;
    RETURN public.rabbitech_owner_sql_console_internal(v_sql, p_confirm_destructive, p_confirmation_phrase);
  EXCEPTION WHEN OTHERS THEN
    v_error := left(SQLERRM, 1000);
    INSERT INTO rabbitech_private.sql_console_audit(actor_user_id, sql_text, command_kind, success, row_count, error_message)
    VALUES (auth.uid(), left(coalesce(v_sql, ''), 12000), coalesce(v_kind, 'UNKNOWN'), false, 0, v_error);
    RETURN jsonb_build_object('ok', false, 'command', coalesce(v_kind, 'UNKNOWN'), 'error', v_error,
      'duration_ms', floor(extract(epoch FROM (clock_timestamp() - v_started)) * 1000));
  END;
END;
$function$;
REVOKE ALL ON FUNCTION public.rabbitech_owner_sql_console(text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rabbitech_owner_sql_console(text, boolean, text) TO authenticated;