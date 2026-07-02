
CREATE TABLE public.dev_daily_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  squad_id UUID NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','concluida','inativa')),
  created_entry_id UUID NULL REFERENCES public.dev_daily_entries(id) ON DELETE SET NULL,
  closed_entry_id UUID NULL REFERENCES public.dev_daily_entries(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NULL,
  inactivated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

CREATE INDEX idx_dev_daily_activities_user_status ON public.dev_daily_activities(user_id, status);
CREATE INDEX idx_dev_daily_activities_created_entry ON public.dev_daily_activities(created_entry_id);
CREATE INDEX idx_dev_daily_activities_closed_entry ON public.dev_daily_activities(closed_entry_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_daily_activities TO authenticated;
GRANT ALL ON public.dev_daily_activities TO service_role;

ALTER TABLE public.dev_daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dev manages own activities"
  ON public.dev_daily_activities
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_permission(auth.uid(), 'daily:manage'))
  WITH CHECK (auth.uid() = user_id OR public.has_permission(auth.uid(), 'daily:manage'));

CREATE TRIGGER update_dev_daily_activities_updated_at
  BEFORE UPDATE ON public.dev_daily_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
