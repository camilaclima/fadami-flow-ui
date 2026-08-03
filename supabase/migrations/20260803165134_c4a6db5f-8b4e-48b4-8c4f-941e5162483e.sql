CREATE OR REPLACE FUNCTION public.upsert_duplicate_daily_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT e.id INTO existing_id
  FROM public.dev_daily_entries e
  WHERE e.user_id = NEW.user_id
    AND COALESCE(e.squad_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.squad_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND e.entry_date = NEW.entry_date
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.dev_daily_entries
    SET did_yesterday = NEW.did_yesterday,
        will_do_today = NEW.will_do_today,
        impediments = NEW.impediments,
        general_notes = NEW.general_notes,
        fill_started_at = COALESCE(fill_started_at, NEW.fill_started_at),
        fill_completed_at = COALESCE(NEW.fill_completed_at, fill_completed_at),
        fill_duration_seconds = COALESCE(NEW.fill_duration_seconds, fill_duration_seconds),
        updated_by = NEW.updated_by,
        updated_at = now()
    WHERE id = existing_id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS upsert_duplicate_daily_entry_trigger ON public.dev_daily_entries;
CREATE TRIGGER upsert_duplicate_daily_entry_trigger
BEFORE INSERT ON public.dev_daily_entries
FOR EACH ROW
EXECUTE FUNCTION public.upsert_duplicate_daily_entry();