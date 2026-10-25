-- Owner-only one-time YouTube API setup for Rabbitech BIOGLOW.
create or replace function public.owner_has_rabbitech_youtube_api_key()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.rb_is_owner() then
    raise exception 'Somente o proprietário pode consultar a configuração da API do YouTube.';
  end if;
  return exists (
    select 1 from public.rabbitech_private_secrets
    where secret_name = 'youtube_data_api_v3'
      and length(btrim(secret_value)) > 0
  );
end;
$$;
revoke all on function public.owner_has_rabbitech_youtube_api_key() from public, anon;
grant execute on function public.owner_has_rabbitech_youtube_api_key() to authenticated;
