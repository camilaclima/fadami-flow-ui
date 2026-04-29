
CREATE TABLE IF NOT EXISTS public.project_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  documentation text NOT NULL DEFAULT '',
  attachment_url text,
  ai_summary text NOT NULL DEFAULT '',
  ai_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.project_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project_contexts"
  ON public.project_contexts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert project_contexts"
  ON public.project_contexts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update project_contexts"
  ON public.project_contexts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete project_contexts"
  ON public.project_contexts FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_project_contexts_updated_at
  BEFORE UPDATE ON public.project_contexts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.project_backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_context_id uuid NOT NULL,
  product_id uuid NOT NULL,
  task text NOT NULL,
  likely_owner text NOT NULL DEFAULT '',
  deadline text NOT NULL DEFAULT '',
  risk_mitigation text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.project_backlog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project_backlog_items"
  ON public.project_backlog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert project_backlog_items"
  ON public.project_backlog_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update project_backlog_items"
  ON public.project_backlog_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete project_backlog_items"
  ON public.project_backlog_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_project_backlog_items_updated_at
  BEFORE UPDATE ON public.project_backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_backlog_items_product ON public.project_backlog_items(product_id);
CREATE INDEX IF NOT EXISTS idx_project_backlog_items_context ON public.project_backlog_items(project_context_id);
