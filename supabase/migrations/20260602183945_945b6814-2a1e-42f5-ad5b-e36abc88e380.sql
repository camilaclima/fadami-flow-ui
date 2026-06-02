CREATE TABLE public.coordinator_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'custom',
  urgency text NOT NULL DEFAULT 'medium',
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  product_id uuid NULL,
  sprint_id uuid NULL,
  activity_id uuid NULL,
  daily_status_id uuid NULL,
  responsible_member_id uuid NULL,
  deadline_date date NULL,
  context_payload jsonb NULL,
  ai_message text NOT NULL DEFAULT '',
  dedup_hash text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL
);

CREATE UNIQUE INDEX coordinator_tasks_dedup_idx
  ON public.coordinator_tasks (dedup_hash)
  WHERE dedup_hash IS NOT NULL AND status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordinator_tasks TO authenticated;
GRANT ALL ON public.coordinator_tasks TO service_role;

ALTER TABLE public.coordinator_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read coordinator_tasks"
  ON public.coordinator_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert coordinator_tasks"
  ON public.coordinator_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update coordinator_tasks"
  ON public.coordinator_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete coordinator_tasks"
  ON public.coordinator_tasks FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_coordinator_tasks_updated_at
  BEFORE UPDATE ON public.coordinator_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();