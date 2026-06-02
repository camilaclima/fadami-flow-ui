
CREATE TABLE public.password_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_email TEXT NOT NULL,
  changed_by UUID,
  changed_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.password_change_logs TO authenticated;
GRANT ALL ON public.password_change_logs TO service_role;

ALTER TABLE public.password_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read password_change_logs"
ON public.password_change_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert password_change_logs"
ON public.password_change_logs FOR INSERT TO authenticated WITH CHECK (true);
