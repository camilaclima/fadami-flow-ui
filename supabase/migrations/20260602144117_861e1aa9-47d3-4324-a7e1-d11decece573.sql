
-- Add allocation factor to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS allocation_percent integer NOT NULL DEFAULT 100;

-- Project stakeholders table
CREATE TABLE IF NOT EXISTS public.project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  contact text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  importance text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stakeholders TO authenticated;
GRANT ALL ON public.project_stakeholders TO service_role;

ALTER TABLE public.project_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read project_stakeholders" ON public.project_stakeholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert project_stakeholders" ON public.project_stakeholders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update project_stakeholders" ON public.project_stakeholders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete project_stakeholders" ON public.project_stakeholders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_project_stakeholders_updated_at
BEFORE UPDATE ON public.project_stakeholders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_stakeholders_product ON public.project_stakeholders(product_id);
