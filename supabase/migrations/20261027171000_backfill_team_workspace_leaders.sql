-- Register existing team owners as leaders in the collaboration workspace.
-- This does not change team ownership or scoring data.
INSERT INTO public.team_memberships(team_id,user_id,display_name,role)
SELECT t.id,t.auth_user_id,
       left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(split_part(coalesce(u.email,''),'@',1),''),'Líder da equipe'),80),
       'leader'
FROM public.teams t
JOIN auth.users u ON u.id=t.auth_user_id
WHERE t.auth_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
