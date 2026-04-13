
-- Team members (colaboradores do time do coordenador)
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinator_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'dev',
  seniority text NOT NULL DEFAULT 'pleno',
  specialty text NOT NULL DEFAULT 'full-stack',
  daily_capacity_hours numeric(4,1) NOT NULL DEFAULT 8.0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read team_members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert team_members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update team_members" ON public.team_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete team_members" ON public.team_members FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sprints
CREATE TABLE public.sprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  coordinator_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  sustentation_percent numeric(5,2) NOT NULL DEFAULT 0,
  ritual_hours numeric(6,1) NOT NULL DEFAULT 0,
  diary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sprints" ON public.sprints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sprints" ON public.sprints FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sprints" ON public.sprints FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sprints" ON public.sprints FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sprint members (vínculo time <-> sprint)
CREATE TABLE public.sprint_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, team_member_id)
);

ALTER TABLE public.sprint_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sprint_members" ON public.sprint_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sprint_members" ON public.sprint_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sprint_members" ON public.sprint_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sprint_members" ON public.sprint_members FOR DELETE TO authenticated USING (true);

-- Sprint unavailabilities (indisponibilidades)
CREATE TABLE public.sprint_unavailabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_member_id uuid NOT NULL REFERENCES public.sprint_members(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'day_off',
  hours numeric(6,1) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sprint_unavailabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sprint_unavailabilities" ON public.sprint_unavailabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sprint_unavailabilities" ON public.sprint_unavailabilities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sprint_unavailabilities" ON public.sprint_unavailabilities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sprint_unavailabilities" ON public.sprint_unavailabilities FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sprint_unavailabilities_updated_at BEFORE UPDATE ON public.sprint_unavailabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sprint backlog items (alocação de subitens na sprint)
CREATE TABLE public.sprint_backlog_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  backlog_sub_item_id uuid NOT NULL REFERENCES public.backlog_sub_items(id) ON DELETE CASCADE,
  backlog_id uuid NOT NULL REFERENCES public.backlogs(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo',
  actual_hours numeric(6,1) NOT NULL DEFAULT 0,
  checklist_questions text NOT NULL DEFAULT '',
  checklist_access text NOT NULL DEFAULT '',
  checklist_dependency text NOT NULL DEFAULT '',
  checklist_tools text NOT NULL DEFAULT '',
  impediment_text text NOT NULL DEFAULT '',
  impediment_deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (sprint_id, backlog_sub_item_id)
);

ALTER TABLE public.sprint_backlog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sprint_backlog_items" ON public.sprint_backlog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sprint_backlog_items" ON public.sprint_backlog_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sprint_backlog_items" ON public.sprint_backlog_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sprint_backlog_items" ON public.sprint_backlog_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sprint_backlog_items_updated_at BEFORE UPDATE ON public.sprint_backlog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
