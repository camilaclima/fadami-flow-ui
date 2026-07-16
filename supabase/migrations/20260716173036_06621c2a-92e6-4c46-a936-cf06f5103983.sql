
CREATE TYPE public.dev_absence_type AS ENUM ('atestado', 'ferias', 'banco_horas', 'interjornada', 'day_off');

CREATE TABLE public.dev_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  squad_id UUID NULL,
  absence_type public.dev_absence_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dev_absences_range_ck CHECK (end_date >= start_date)
);

CREATE INDEX idx_dev_absences_user_range ON public.dev_absences (user_id, start_date, end_date) WHERE active;
CREATE INDEX idx_dev_absences_squad ON public.dev_absences (squad_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_absences TO authenticated;
GRANT ALL ON public.dev_absences TO service_role;

ALTER TABLE public.dev_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read absences"
  ON public.dev_absences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert absences"
  ON public.dev_absences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admins can update absences"
  ON public.dev_absences FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'painel_gp'))
  WITH CHECK (created_by = auth.uid() OR public.has_permission(auth.uid(), 'painel_gp'));

CREATE POLICY "Creator or admins can delete absences"
  ON public.dev_absences FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'painel_gp'));

CREATE TRIGGER trg_dev_absences_updated_at
  BEFORE UPDATE ON public.dev_absences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add absence linkage to daily attendance
ALTER TABLE public.daily_meeting_attendance
  ADD COLUMN IF NOT EXISTS absence_type public.dev_absence_type NULL,
  ADD COLUMN IF NOT EXISTS absence_id UUID NULL;
