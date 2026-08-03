UPDATE public.dev_daily_activities
SET description = reverse(description), updated_at = now()
WHERE lower(description) ~ '(latigid|oigádep|oigadep)';