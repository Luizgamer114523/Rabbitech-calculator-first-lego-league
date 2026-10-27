CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS TABLE(
  rank_position bigint,
  team_name text,
  average_score numeric,
  rounds_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    row_number() OVER (
      ORDER BY avg(r.score) DESC, count(*) DESC, t.name ASC
    )::bigint,
    t.name::text,
    round(avg(r.score), 2)::numeric,
    count(*)::bigint
  FROM public.teams t
  JOIN public.rounds r ON r.team_id = t.id
  GROUP BY t.id, t.name
  HAVING count(*) >= 3
  ORDER BY avg(r.score) DESC, count(*) DESC, t.name ASC;
$function$;