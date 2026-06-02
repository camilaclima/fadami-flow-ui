CREATE TABLE public.activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  changed_by uuid NULL,
  changed_by_email text NOT NULL DEFAULT '',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_history TO authenticated;
GRANT ALL ON public.activity_history TO service_role;

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_history"
  ON public.activity_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert activity_history"
  ON public.activity_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_activity_history_activity ON public.activity_history(activity_id, created_at DESC);