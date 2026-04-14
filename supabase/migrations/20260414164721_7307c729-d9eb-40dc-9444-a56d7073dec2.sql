CREATE TABLE public.sprint_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  sprint_backlog_item_id uuid REFERENCES public.sprint_backlog_items(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT ''
);

ALTER TABLE public.sprint_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sprint_diary_entries" ON public.sprint_diary_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sprint_diary_entries" ON public.sprint_diary_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sprint_diary_entries" ON public.sprint_diary_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sprint_diary_entries" ON public.sprint_diary_entries FOR DELETE TO authenticated USING (true);