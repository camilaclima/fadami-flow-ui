
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_profile_id UUID,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read squads" ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert squads" ON public.squads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update squads" ON public.squads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete squads" ON public.squads FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, team_member_id)
);
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read squad_members" ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert squad_members" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete squad_members" ON public.squad_members FOR DELETE TO authenticated USING (true);

CREATE TABLE public.squad_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, product_id)
);
ALTER TABLE public.squad_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read squad_products" ON public.squad_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert squad_products" ON public.squad_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete squad_products" ON public.squad_products FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_squad_members_squad ON public.squad_members(squad_id);
CREATE INDEX idx_squad_products_squad ON public.squad_products(squad_id);
CREATE INDEX idx_squad_products_product ON public.squad_products(product_id);
