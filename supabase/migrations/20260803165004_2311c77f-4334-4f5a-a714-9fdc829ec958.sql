WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id,
                        COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
                        created_entry_id,
                        lower(regexp_replace(trim(description), '\\s+', ' ', 'g')),
                        status
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_activities
  WHERE created_entry_id IS NOT NULL
)
DELETE FROM public.dev_daily_activities a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS dev_daily_activities_entry_description_status_unique
ON public.dev_daily_activities (
  user_id,
  COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
  created_entry_id,
  lower(regexp_replace(trim(description), '\\s+', ' ', 'g')),
  status
)
WHERE created_entry_id IS NOT NULL;