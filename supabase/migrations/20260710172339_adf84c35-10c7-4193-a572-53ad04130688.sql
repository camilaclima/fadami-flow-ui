
-- Squad leaders (many-to-many)
CREATE TABLE public.squad_leaders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_leaders TO authenticated;
GRANT ALL ON public.squad_leaders TO service_role;
ALTER TABLE public.squad_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read squad_leaders" ON public.squad_leaders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write squad_leaders" ON public.squad_leaders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profile squads (many-to-many)
CREATE TABLE public.profile_squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, squad_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_squads TO authenticated;
GRANT ALL ON public.profile_squads TO service_role;
ALTER TABLE public.profile_squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read profile_squads" ON public.profile_squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated write profile_squads" ON public.profile_squads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Backfill squad_leaders from existing single leader
INSERT INTO public.squad_leaders (squad_id, profile_id)
SELECT id, leader_profile_id FROM public.squads WHERE leader_profile_id IS NOT NULL
ON CONFLICT DO NOTHING;
