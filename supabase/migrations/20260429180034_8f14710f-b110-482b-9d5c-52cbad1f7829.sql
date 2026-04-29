CREATE TABLE public.daily_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  sprint_id uuid NOT NULL,
  status_date date NOT NULL DEFAULT CURRENT_DATE,
  present_member_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  blocker_level integer NOT NULL DEFAULT 1,
  ai_insights jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.daily_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_status"
  ON public.daily_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert daily_status"
  ON public.daily_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update daily_status"
  ON public.daily_status FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete daily_status"
  ON public.daily_status FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_daily_status_updated_at
  BEFORE UPDATE ON public.daily_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daily_status_product_date ON public.daily_status(product_id, status_date DESC);
CREATE INDEX idx_daily_status_sprint ON public.daily_status(sprint_id);