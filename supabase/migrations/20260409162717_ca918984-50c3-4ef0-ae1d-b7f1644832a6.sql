
ALTER TABLE public.backlog_sub_items
  ADD COLUMN IF NOT EXISTS code_block text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS implementation_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS effort_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS complexity text NOT NULL DEFAULT '';
