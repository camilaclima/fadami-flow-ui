
-- dev_daily_entries
CREATE TABLE public.dev_daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  squad_id UUID,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_yesterday TEXT,
  will_do_today TEXT,
  impediments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_daily_entries TO authenticated;
GRANT ALL ON public.dev_daily_entries TO service_role;
ALTER TABLE public.dev_daily_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read dev_daily_entries" ON public.dev_daily_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert dev_daily_entries" ON public.dev_daily_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update dev_daily_entries" ON public.dev_daily_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete dev_daily_entries" ON public.dev_daily_entries FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_dev_daily_entries_updated BEFORE UPDATE ON public.dev_daily_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_dev_daily_entries_user_date ON public.dev_daily_entries (user_id, entry_date DESC);
CREATE INDEX idx_dev_daily_entries_squad_date ON public.dev_daily_entries (squad_id, entry_date DESC);

-- daily_meetings
CREATE TABLE public.daily_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conducted_by UUID,
  observations TEXT,
  transcript_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_meetings TO authenticated;
GRANT ALL ON public.daily_meetings TO service_role;
ALTER TABLE public.daily_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read daily_meetings" ON public.daily_meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert daily_meetings" ON public.daily_meetings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update daily_meetings" ON public.daily_meetings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete daily_meetings" ON public.daily_meetings FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_daily_meetings_updated BEFORE UPDATE ON public.daily_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_daily_meetings_squad_date ON public.daily_meetings (squad_id, meeting_date DESC);

-- daily_meeting_attendance
CREATE TABLE public.daily_meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.daily_meetings(id) ON DELETE CASCADE,
  member_user_id UUID,
  member_name TEXT,
  camera_on BOOLEAN NOT NULL DEFAULT false,
  stayed_silent BOOLEAN NOT NULL DEFAULT false,
  dev_entry_id UUID REFERENCES public.dev_daily_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_meeting_attendance TO authenticated;
GRANT ALL ON public.daily_meeting_attendance TO service_role;
ALTER TABLE public.daily_meeting_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read daily_meeting_attendance" ON public.daily_meeting_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert daily_meeting_attendance" ON public.daily_meeting_attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update daily_meeting_attendance" ON public.daily_meeting_attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete daily_meeting_attendance" ON public.daily_meeting_attendance FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_daily_meeting_attendance_updated BEFORE UPDATE ON public.daily_meeting_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_daily_meeting_attendance_meeting ON public.daily_meeting_attendance (meeting_id);
