
WITH user_squads AS (
  SELECT p.user_id,
         COUNT(DISTINCT ps.squad_id) AS n,
         (ARRAY_AGG(ps.squad_id))[1] AS only_squad
  FROM public.profiles p
  JOIN public.profile_squads ps ON ps.profile_id = p.id
  GROUP BY p.user_id
)
UPDATE public.dev_daily_entries e
SET squad_id = us.only_squad
FROM user_squads us
WHERE e.user_id = us.user_id
  AND e.squad_id IS NULL
  AND us.n = 1;

WITH user_squads AS (
  SELECT p.user_id,
         COUNT(DISTINCT ps.squad_id) AS n,
         (ARRAY_AGG(ps.squad_id))[1] AS only_squad
  FROM public.profiles p
  JOIN public.profile_squads ps ON ps.profile_id = p.id
  GROUP BY p.user_id
)
UPDATE public.dev_daily_activities a
SET squad_id = us.only_squad
FROM user_squads us
WHERE a.user_id = us.user_id
  AND a.squad_id IS NULL
  AND us.n = 1;
