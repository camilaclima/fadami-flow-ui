CREATE OR REPLACE FUNCTION public.prevent_duplicate_daily_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_entry_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.dev_daily_activities a
    WHERE a.user_id = NEW.user_id
      AND COALESCE(a.squad_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(NEW.squad_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.created_entry_id = NEW.created_entry_id
      AND a.status = NEW.status
      AND lower(regexp_replace(trim(a.description), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(NEW.description), '\\s+', ' ', 'g'))
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_daily_activity_trigger ON public.dev_daily_activities;
CREATE TRIGGER prevent_duplicate_daily_activity_trigger
BEFORE INSERT ON public.dev_daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_daily_activity();