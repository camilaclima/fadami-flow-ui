
CREATE TYPE public.impediment_urgency AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.dev_daily_impediments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.dev_daily_entries(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  urgency public.impediment_urgency NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

CREATE INDEX dev_daily_impediments_entry_id_idx ON public.dev_daily_impediments(entry_id);
CREATE INDEX dev_daily_impediments_resolved_idx ON public.dev_daily_impediments(resolved);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_daily_impediments TO authenticated;
GRANT ALL ON public.dev_daily_impediments TO service_role;

ALTER TABLE public.dev_daily_impediments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view impediments from accessible dailies"
ON public.dev_daily_impediments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
  )
);

CREATE POLICY "Users can insert impediments on their own dailies"
ON public.dev_daily_impediments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update impediments on their own dailies"
ON public.dev_daily_impediments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete impediments on their own dailies"
ON public.dev_daily_impediments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND e.user_id = auth.uid()
  )
);

CREATE TRIGGER update_dev_daily_impediments_updated_at
BEFORE UPDATE ON public.dev_daily_impediments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
