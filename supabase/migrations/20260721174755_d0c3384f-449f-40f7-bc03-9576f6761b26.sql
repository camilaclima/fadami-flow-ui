
CREATE TABLE public.daily_entry_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL UNIQUE REFERENCES public.dev_daily_entries(id) ON DELETE CASCADE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_entry_tags TO authenticated;
GRANT ALL ON public.daily_entry_tags TO service_role;

ALTER TABLE public.daily_entry_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read daily_entry_tags"
  ON public.daily_entry_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins insert daily_entry_tags"
  ON public.daily_entry_tags FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE POLICY "admins update daily_entry_tags"
  ON public.daily_entry_tags FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'))
  WITH CHECK (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE POLICY "admins delete daily_entry_tags"
  ON public.daily_entry_tags FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'admin'));

CREATE TRIGGER trg_daily_entry_tags_updated_at
  BEFORE UPDATE ON public.daily_entry_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
