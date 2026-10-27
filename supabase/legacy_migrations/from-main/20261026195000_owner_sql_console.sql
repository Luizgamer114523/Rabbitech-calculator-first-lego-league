-- Rabbitech BIOGLOW: owner-only SQL console
-- Applied to Supabase project ieijssfqonoucqheedac on 2026-10-26.
create schema if not exists rabbitech_private;
revoke all on schema rabbitech_private from public, anon, authenticated;

create table if not exists rabbitech_private.sql_console_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  sql_text text not null,
  command_kind text not null,
  success boolean not null,
  row_count integer,
  result_preview jsonb,
  error_message text,
  created_at timestamptz not null default now()
);
revoke all on rabbitech_private.sql_console_audit from public, anon, authenticated;

create or replace function public.rabbitech_owner_sql_console(
  p_sql text, p_confirm_destructive boolean default false, p_confirmation_phrase text default null
) returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  v_sql text := btrim(coalesce(p_sql, '')); v_upper text; v_kind text; v_row record;
  v_rows jsonb := '[]'::jsonb; v_count integer := 0; v_destructive boolean := false;
  v_started timestamptz := clock_timestamp(); v_error text;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     or not exists (select 1 from public.app_admins a where a.user_id = auth.uid()) then
    raise exception 'Console SQL disponível somente para a conta proprietária autenticada.' using errcode = '42501';
  end if;
  if v_sql = '' or length(v_sql) > 12000 then raise exception 'Informe um comando SQL de até 12.000 caracteres.' using errcode = '22023'; end if;
  v_sql := regexp_replace(v_sql, ';[[:space:]]*$', '');
  if position(';' in v_sql) > 0 or position('--' in v_sql) > 0 or position('/*' in v_sql) > 0 or position('*/' in v_sql) > 0 then
    raise exception 'Execute um único comando, sem comentários SQL nem múltiplas instruções.' using errcode = '22023';
  end if;
  v_upper := upper(v_sql); v_kind := upper(substring(v_sql from '^[[:space:]]*([A-Z]+)'));
  if v_upper ~ '\m(COPY|DO|CALL|GRANT|REVOKE|SECURITY[[:space:]]+DEFINER|CREATE[[:space:]]+(FUNCTION|PROCEDURE|TRIGGER|EXTENSION|ROLE|USER|SCHEMA)|DROP[[:space:]]+(FUNCTION|PROCEDURE|TRIGGER|EXTENSION|ROLE|USER|SCHEMA|DATABASE)|ALTER[[:space:]]+(ROLE|USER|SYSTEM|DATABASE|FUNCTION|PROCEDURE|SCHEMA)|SET[[:space:]]+(ROLE|SESSION|CONFIGURATION)|RESET|VACUUM|ANALYZE|LISTEN|NOTIFY|PG_[A-Z0-9_]*|DBLINK[A-Z0-9_]*|LO_[A-Z0-9_]*|SET_CONFIG|CURRENT_SETTING)\M' then
    raise exception 'Comando ou função privilegiada bloqueada pelo console seguro.' using errcode = '42501';
  end if;
  if v_upper ~ '\m(AUTH|STORAGE|PG_CATALOG|INFORMATION_SCHEMA|RABBITECH_PRIVATE)[[:space:]]*\.' then
    raise exception 'O console só pode acessar objetos do schema public.' using errcode = '42501';
  end if;
  if v_kind in ('SELECT','WITH') then
    if v_upper ~ '\m(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE)\M' then raise exception 'Consultas SELECT não podem conter operações de escrita.' using errcode = '42501'; end if;
    if v_sql ~* '([a-zA-Z_][a-zA-Z0-9_.]*)[[:space:]]*\(' then
      if regexp_replace(v_sql, '\m(count|sum|avg|min|max|coalesce|nullif|lower|upper|trim|length|char_length|substring|round|floor|ceil|date_trunc|extract|to_char|to_date|json_build_object|jsonb_build_object|json_agg|jsonb_agg|string_agg|array_agg|bool_and|bool_or|greatest|least|concat|replace|regexp_replace)\s*\(', '', 'gi') ~* '[a-zA-Z_][a-zA-Z0-9_.]*[[:space:]]*\(' then raise exception 'A consulta contém chamada de função não permitida.' using errcode = '42501'; end if;
    end if;
    v_kind := 'SELECT';
  elsif v_kind in ('INSERT','UPDATE','DELETE') then
    v_destructive := true;
    if v_sql !~* '^[[:space:]]*(INSERT[[:space:]]+INTO|UPDATE|DELETE[[:space:]]+FROM)[[:space:]]+(public\.)?[a-zA-Z_][a-zA-Z0-9_]*\M' then raise exception 'Escritas só são permitidas em tabelas do schema public.' using errcode = '42501'; end if;
  elsif v_kind in ('CREATE','ALTER','DROP','TRUNCATE') then
    v_destructive := true;
    if v_sql !~* '^[[:space:]]*(CREATE[[:space:]]+TABLE|ALTER[[:space:]]+TABLE|DROP[[:space:]]+TABLE|TRUNCATE[[:space:]]+(TABLE[[:space:]]+)?)\s+(IF[[:space:]]+(NOT[[:space:]]+)?EXISTS[[:space:]]+)?(public\.)?[a-zA-Z_][a-zA-Z0-9_]*\M' then raise exception 'DDL limitado a CREATE/ALTER/DROP/TRUNCATE TABLE no schema public.' using errcode = '42501'; end if;
  else raise exception 'Comando não permitido. Use SELECT, INSERT, UPDATE, DELETE ou DDL limitado a tabelas public.' using errcode = '22023';
  end if;
  if v_destructive and (p_confirm_destructive is distinct from true or p_confirmation_phrase is distinct from 'CONFIRMAR ALTERAÇÃO') then raise exception 'Operação de escrita ou destrutiva requer a confirmação CONFIRMAR ALTERAÇÃO.' using errcode = '22023'; end if;
  begin
    if v_kind = 'SELECT' then
      for v_row in execute v_sql loop v_count := v_count + 1; if v_count <= 200 then v_rows := v_rows || jsonb_build_array(to_jsonb(v_row)); end if; if v_count >= 1000 then exit; end if; end loop;
    elsif v_kind in ('INSERT','UPDATE','DELETE') and v_upper ~ '\mRETURNING\M' then
      for v_row in execute v_sql loop v_count := v_count + 1; if v_count <= 200 then v_rows := v_rows || jsonb_build_array(to_jsonb(v_row)); end if; if v_count >= 1000 then exit; end if; end loop;
    else execute v_sql; get diagnostics v_count = row_count;
    end if;
    insert into rabbitech_private.sql_console_audit(actor_user_id,sql_text,command_kind,success,row_count,result_preview) values(auth.uid(),v_sql,v_kind,true,v_count,v_rows);
    return jsonb_build_object('ok',true,'command',v_kind,'row_count',v_count,'rows',v_rows,'truncated',v_count>200,'duration_ms',floor(extract(epoch from (clock_timestamp()-v_started))*1000));
  exception when others then
    v_error := left(sqlerrm,1000);
    insert into rabbitech_private.sql_console_audit(actor_user_id,sql_text,command_kind,success,row_count,error_message) values(auth.uid(),v_sql,v_kind,false,0,v_error);
    return jsonb_build_object('ok',false,'command',v_kind,'error',v_error,'duration_ms',floor(extract(epoch from (clock_timestamp()-v_started))*1000));
  end;
end;
$function$;

create or replace function public.rabbitech_owner_sql_console_logs(p_limit integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> '7e799691-ba7e-42ea-ab6f-71ad11ca32ff'::uuid
     or not exists (select 1 from public.app_admins a where a.user_id = auth.uid()) then
    raise exception 'Auditoria disponível somente para a conta proprietária autenticada.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) into v_result
  from (select id,actor_user_id,sql_text,command_kind,success,row_count,result_preview,error_message,created_at from rabbitech_private.sql_console_audit order by created_at desc limit greatest(1,least(coalesce(p_limit,30),100))) q;
  return v_result;
end;
$function$;
revoke all on function public.rabbitech_owner_sql_console(text,boolean,text) from public, anon;
revoke all on function public.rabbitech_owner_sql_console_logs(integer) from public, anon;
grant execute on function public.rabbitech_owner_sql_console(text,boolean,text) to authenticated;
grant execute on function public.rabbitech_owner_sql_console_logs(integer) to authenticated;
