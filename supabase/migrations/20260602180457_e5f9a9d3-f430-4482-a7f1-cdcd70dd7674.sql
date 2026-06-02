-- Multi-product sprints + multi-responsible activities + description

CREATE TABLE IF NOT EXISTS public.sprint_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_products TO authenticated;
GRANT ALL ON public.sprint_products TO service_role;

ALTER TABLE public.sprint_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read sprint_products" ON public.sprint_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sprint_products" ON public.sprint_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sprint_products" ON public.sprint_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete sprint_products" ON public.sprint_products FOR DELETE TO authenticated USING (true);

-- Backfill from existing sprints.product_id
INSERT INTO public.sprint_products (sprint_id, product_id)
SELECT id, product_id FROM public.sprints WHERE product_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Activities: multi-responsible + description
ALTER TABLE public.project_backlog_items
  ADD COLUMN IF NOT EXISTS responsible_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';

-- Backfill responsible_ids from responsible_id
UPDATE public.project_backlog_items
SET responsible_ids = ARRAY[responsible_id]
WHERE responsible_id IS NOT NULL AND (responsible_ids IS NULL OR array_length(responsible_ids, 1) IS NULL);