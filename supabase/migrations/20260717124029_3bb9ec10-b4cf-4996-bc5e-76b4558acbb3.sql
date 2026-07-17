
ALTER TABLE public.dev_daily_entries
  ADD COLUMN IF NOT EXISTS fill_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fill_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fill_duration_seconds INTEGER;

ALTER TABLE public.daily_meetings
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
