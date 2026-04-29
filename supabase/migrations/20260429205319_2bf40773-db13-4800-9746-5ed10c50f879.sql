ALTER TABLE public.project_backlog_items
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Existing rows pre-migration are considered approved to avoid breaking ongoing projects
UPDATE public.project_backlog_items SET approved = true WHERE approved = false;