UPDATE public.daily_meetings
SET meeting_date = '2026-08-03', updated_at = now()
WHERE meeting_date = '2026-07-31'
  AND created_at >= '2026-08-03 00:00:00+00'
  AND created_at < '2026-08-04 00:00:00+00';