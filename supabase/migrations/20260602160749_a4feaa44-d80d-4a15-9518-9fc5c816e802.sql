CREATE TABLE public.team_member_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_member_products TO authenticated;
GRANT ALL ON public.team_member_products TO service_role;

ALTER TABLE public.team_member_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read team_member_products" ON public.team_member_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert team_member_products" ON public.team_member_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update team_member_products" ON public.team_member_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete team_member_products" ON public.team_member_products FOR DELETE TO authenticated USING (true);

-- Backfill existing single product_id allocations into the junction
INSERT INTO public.team_member_products (team_member_id, product_id)
SELECT id, product_id FROM public.team_members
WHERE product_id IS NOT NULL
ON CONFLICT DO NOTHING;