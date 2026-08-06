-- 1) Consolidar duplicatas dentro do mesmo registro de daily
WITH grp AS (
  SELECT
    id,
    user_id,
    COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid) AS sq,
    created_entry_id,
    lower(regexp_replace(trim(description), '\s+', ' ', 'g')) AS norm,
    status,
    card_code,
    dev_notes,
    closed_entry_id,
    completed_at,
    inactivated_at,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id,
        COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
        created_entry_id,
        lower(regexp_replace(trim(description), '\s+', ' ', 'g'))
      ORDER BY
        CASE status WHEN 'concluida' THEN 0 WHEN 'inativa' THEN 1 ELSE 2 END,
        created_at
    ) AS rn
  FROM public.dev_daily_activities
  WHERE created_entry_id IS NOT NULL
),
keepers AS (
  SELECT * FROM grp WHERE rn = 1
),
losers AS (
  SELECT * FROM grp WHERE rn > 1
),
merged AS (
  SELECT
    k.id,
    COALESCE(NULLIF(k.card_code, ''), MAX(NULLIF(l.card_code, ''))) AS card_code,
    COALESCE(NULLIF(k.dev_notes, ''), MAX(NULLIF(l.dev_notes, ''))) AS dev_notes,
    COALESCE(k.closed_entry_id, (array_agg(l.closed_entry_id) FILTER (WHERE l.closed_entry_id IS NOT NULL))[1]) AS closed_entry_id,
    COALESCE(k.completed_at, MAX(l.completed_at)) AS completed_at,
    COALESCE(k.inactivated_at, MAX(l.inactivated_at)) AS inactivated_at
  FROM keepers k
  JOIN losers l
    ON l.user_id = k.user_id
   AND l.sq = k.sq
   AND l.created_entry_id = k.created_entry_id
   AND l.norm = k.norm
  GROUP BY k.id, k.card_code, k.dev_notes, k.closed_entry_id, k.completed_at, k.inactivated_at
)
UPDATE public.dev_daily_activities a
SET card_code = COALESCE(m.card_code, a.card_code),
    dev_notes = COALESCE(m.dev_notes, a.dev_notes),
    closed_entry_id = COALESCE(m.closed_entry_id, a.closed_entry_id),
    completed_at = COALESCE(m.completed_at, a.completed_at),
    inactivated_at = COALESCE(m.inactivated_at, a.inactivated_at)
FROM merged m
WHERE a.id = m.id;

WITH grp AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id,
        COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
        created_entry_id,
        lower(regexp_replace(trim(description), '\s+', ' ', 'g'))
      ORDER BY
        CASE status WHEN 'concluida' THEN 0 WHEN 'inativa' THEN 1 ELSE 2 END,
        created_at
    ) AS rn
  FROM public.dev_daily_activities
  WHERE created_entry_id IS NOT NULL
)
DELETE FROM public.dev_daily_activities a
USING grp
WHERE a.id = grp.id AND grp.rn > 1;

-- 2) Nova trava: uma atividade por texto dentro do mesmo registro de daily
CREATE UNIQUE INDEX IF NOT EXISTS dev_daily_activities_entry_description_unique
  ON public.dev_daily_activities (
    user_id,
    COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
    created_entry_id,
    lower(regexp_replace(trim(description), '\s+', ' ', 'g'))
  )
  WHERE created_entry_id IS NOT NULL;

DROP INDEX IF EXISTS public.dev_daily_activities_entry_description_status_unique;

-- 3) Atualizar a rotina de criação/atualização para a nova chave
CREATE OR REPLACE FUNCTION public.upsert_dev_daily_activity(
  _user_id uuid, _squad_id uuid, _description text, _card_code text, _status text,
  _created_entry_id uuid, _closed_entry_id uuid, _completed_at timestamp with time zone,
  _dev_notes text, _updated_by uuid
)
RETURNS public.dev_daily_activities
LANGUAGE sql
SET search_path TO 'public'
AS $function$
  INSERT INTO public.dev_daily_activities (
    user_id, squad_id, description, card_code, status, created_entry_id,
    closed_entry_id, completed_at, dev_notes, updated_by
  ) VALUES (
    _user_id, _squad_id, _description, _card_code, _status, _created_entry_id,
    _closed_entry_id, _completed_at, _dev_notes, _updated_by
  )
  ON CONFLICT (
    user_id,
    COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
    created_entry_id,
    lower(regexp_replace(trim(description), '\s+', ' ', 'g'))
  ) WHERE created_entry_id IS NOT NULL
  DO UPDATE SET
    status = EXCLUDED.status,
    card_code = COALESCE(NULLIF(EXCLUDED.card_code, ''), dev_daily_activities.card_code),
    closed_entry_id = COALESCE(EXCLUDED.closed_entry_id, dev_daily_activities.closed_entry_id),
    completed_at = COALESCE(EXCLUDED.completed_at, dev_daily_activities.completed_at),
    dev_notes = COALESCE(EXCLUDED.dev_notes, dev_daily_activities.dev_notes),
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  RETURNING dev_daily_activities.*;
$function$;