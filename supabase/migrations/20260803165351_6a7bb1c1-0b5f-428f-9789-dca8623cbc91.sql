UPDATE public.daily_meeting_attendance a
SET member_user_id = NULL
WHERE member_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = a.member_user_id);