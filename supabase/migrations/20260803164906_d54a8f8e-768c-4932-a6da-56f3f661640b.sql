WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS keep_id,
         row_number() OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_entries
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.dev_daily_activities a
SET created_entry_id = d.keep_id
FROM duplicates d
WHERE a.created_entry_id = d.id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS keep_id,
         row_number() OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_entries
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.dev_daily_activities a
SET closed_entry_id = d.keep_id
FROM duplicates d
WHERE a.closed_entry_id = d.id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS keep_id,
         row_number() OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_entries
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.dev_daily_impediments i
SET entry_id = d.keep_id
FROM duplicates d
WHERE i.entry_id = d.id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS keep_id,
         row_number() OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_entries
), duplicates AS (
  SELECT id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.daily_meeting_attendance a
SET dev_entry_id = d.keep_id
FROM duplicates d
WHERE a.dev_entry_id = d.id;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), entry_date
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.dev_daily_entries
)
DELETE FROM public.dev_daily_entries e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS dev_daily_entries_user_squad_date_unique
ON public.dev_daily_entries (
  user_id,
  COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
  entry_date
);

DROP POLICY IF EXISTS "Users can update impediments on their own dailies" ON public.dev_daily_impediments;
CREATE POLICY "Owners and daily managers can update impediments"
ON public.dev_daily_impediments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND (
        e.user_id = auth.uid()
        OR public.has_permission(auth.uid(), 'painel_gp')
        OR public.has_permission(auth.uid(), 'daily:manage')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND (
        e.user_id = auth.uid()
        OR public.has_permission(auth.uid(), 'painel_gp')
        OR public.has_permission(auth.uid(), 'daily:manage')
      )
  )
);