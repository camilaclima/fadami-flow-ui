CREATE TABLE public.daily_bottleneck_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_key text NOT NULL,
  product_id uuid,
  sprint_id uuid,
  resolved_by uuid,
  resolved_by_email text DEFAULT '',
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dbr_key ON public.daily_bottleneck_resolutions (descricao_key);
CREATE INDEX idx_dbr_product ON public.daily_bottleneck_resolutions (product_id);
CREATE INDEX idx_dbr_sprint ON public.daily_bottleneck_resolutions (sprint_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_bottleneck_resolutions TO authenticated;
GRANT ALL ON public.daily_bottleneck_resolutions TO service_role;
ALTER TABLE public.daily_bottleneck_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bottleneck resolutions" ON public.daily_bottleneck_resolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert bottleneck resolutions" ON public.daily_bottleneck_resolutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete bottleneck resolutions" ON public.daily_bottleneck_resolutions FOR DELETE TO authenticated USING (true);