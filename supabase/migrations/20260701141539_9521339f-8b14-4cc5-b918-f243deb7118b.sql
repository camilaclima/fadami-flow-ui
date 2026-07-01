
ALTER TABLE public.daily_meeting_attendance
  ADD COLUMN IF NOT EXISTS absent_from_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS did_not_participate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS non_participation_reason text;
