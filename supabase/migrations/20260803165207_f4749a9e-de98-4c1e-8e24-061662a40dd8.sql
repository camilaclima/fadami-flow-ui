DROP TRIGGER IF EXISTS upsert_duplicate_daily_entry_trigger ON public.dev_daily_entries;
DROP FUNCTION IF EXISTS public.upsert_duplicate_daily_entry();