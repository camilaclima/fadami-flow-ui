ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members (lower(email));