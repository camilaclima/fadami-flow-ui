
DO $$
DECLARE
  r RECORD;
  tgt uuid;
BEGIN
  FOR r IN
    SELECT * FROM public.dev_daily_entries
    WHERE entry_date = '2026-08-03'
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = '2026-08-03'
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::time < '17:00'
  LOOP
    SELECT e.id INTO tgt
    FROM public.dev_daily_entries e
    WHERE e.entry_date = '2026-07-31'
      AND e.user_id = r.user_id
      AND COALESCE(e.squad_id,'00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(r.squad_id,'00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY e.created_at
    LIMIT 1;

    IF tgt IS NULL THEN
      UPDATE public.dev_daily_entries SET entry_date = '2026-07-31', updated_at = now() WHERE id = r.id;
      CONTINUE;
    END IF;

    -- merge textual fields
    UPDATE public.dev_daily_entries t SET
      did_yesterday = NULLIF(concat_ws(E'\n', NULLIF(t.did_yesterday,''), NULLIF(r.did_yesterday,'')), ''),
      will_do_today = NULLIF(concat_ws(E'\n', NULLIF(t.will_do_today,''), NULLIF(r.will_do_today,'')), ''),
      impediments   = NULLIF(concat_ws(E'\n', NULLIF(t.impediments,''), NULLIF(r.impediments,'')), ''),
      general_notes = NULLIF(concat_ws(E'\n', NULLIF(t.general_notes,''), NULLIF(r.general_notes,'')), ''),
      fill_started_at = LEAST(COALESCE(t.fill_started_at, r.fill_started_at), COALESCE(r.fill_started_at, t.fill_started_at)),
      fill_completed_at = GREATEST(COALESCE(t.fill_completed_at, r.fill_completed_at), COALESCE(r.fill_completed_at, t.fill_completed_at)),
      fill_duration_seconds = COALESCE(t.fill_duration_seconds, r.fill_duration_seconds),
      updated_at = now()
    WHERE t.id = tgt;

    -- remove duplicate activities that would violate the unique key on repoint
    DELETE FROM public.dev_daily_activities a
    WHERE a.created_entry_id = r.id
      AND EXISTS (
        SELECT 1 FROM public.dev_daily_activities b
        WHERE b.created_entry_id = tgt
          AND b.user_id = a.user_id
          AND COALESCE(b.squad_id,'00000000-0000-0000-0000-000000000000'::uuid)
              = COALESCE(a.squad_id,'00000000-0000-0000-0000-000000000000'::uuid)
          AND lower(regexp_replace(trim(b.description), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(a.description), '\s+', ' ', 'g'))
          AND b.status = a.status
      );

    UPDATE public.dev_daily_activities SET created_entry_id = tgt WHERE created_entry_id = r.id;
    UPDATE public.dev_daily_activities SET closed_entry_id = tgt WHERE closed_entry_id = r.id;
    UPDATE public.dev_daily_impediments SET entry_id = tgt WHERE entry_id = r.id;
    UPDATE public.daily_meeting_attendance SET dev_entry_id = tgt WHERE dev_entry_id = r.id;

    DELETE FROM public.daily_entry_tags x
    WHERE x.entry_id = r.id AND EXISTS (SELECT 1 FROM public.daily_entry_tags y WHERE y.entry_id = tgt);
    UPDATE public.daily_entry_tags SET entry_id = tgt WHERE entry_id = r.id;

    DELETE FROM public.dev_daily_entries WHERE id = r.id;
  END LOOP;
END $$;
