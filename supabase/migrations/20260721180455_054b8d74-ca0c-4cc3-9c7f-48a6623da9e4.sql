
CREATE TABLE public.daily_executive_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text,
  content_text text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_executive_reports TO authenticated;
GRANT ALL ON public.daily_executive_reports TO service_role;

ALTER TABLE public.daily_executive_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read exec reports"
ON public.daily_executive_reports FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE POLICY "admins insert exec reports"
ON public.daily_executive_reports FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE POLICY "admins update exec reports"
ON public.daily_executive_reports FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'))
WITH CHECK (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE POLICY "admins delete exec reports"
ON public.daily_executive_reports FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE TRIGGER update_daily_executive_reports_updated_at
BEFORE UPDATE ON public.daily_executive_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_executive_reports_period ON public.daily_executive_reports(period_start, period_end);
