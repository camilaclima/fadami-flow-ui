ALTER TABLE public.daily_meeting_attendance
ADD CONSTRAINT daily_meeting_attendance_member_user_id_fkey
FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;