
-- Estender project_backlog_items para suportar Atividades com sprint, dependência, impacto e status
ALTER TABLE public.project_backlog_items
  ADD COLUMN IF NOT EXISTS impact text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sprint_id uuid NULL,
  ADD COLUMN IF NOT EXISTS dependency_id uuid NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS responsible_id uuid NULL,
  ADD COLUMN IF NOT EXISTS deadline_date date NULL;

CREATE INDEX IF NOT EXISTS idx_pbi_sprint ON public.project_backlog_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_pbi_dependency ON public.project_backlog_items(dependency_id);
CREATE INDEX IF NOT EXISTS idx_pbi_deadline ON public.project_backlog_items(deadline_date);
