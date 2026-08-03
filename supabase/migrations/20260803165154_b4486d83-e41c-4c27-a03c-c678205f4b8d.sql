DROP TRIGGER IF EXISTS prevent_duplicate_daily_activity_trigger ON public.dev_daily_activities;
DROP FUNCTION IF EXISTS public.prevent_duplicate_daily_activity();