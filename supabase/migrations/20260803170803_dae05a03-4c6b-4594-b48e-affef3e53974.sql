UPDATE public.dev_daily_entries
SET entry_date = DATE '2026-08-03',
    updated_at = now()
WHERE entry_date = DATE '2026-07-31'
  AND created_at >= TIMESTAMPTZ '2026-08-03 00:00:00-03'
  AND created_at < TIMESTAMPTZ '2026-08-04 00:00:00-03';