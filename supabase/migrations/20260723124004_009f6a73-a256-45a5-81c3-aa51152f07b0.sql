DROP POLICY IF EXISTS "Authenticated users can read team_members" ON public.team_members;

CREATE POLICY "Read team_members with work permission"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.has_permission(auth.uid(), 'team')
  OR public.has_permission(auth.uid(), 'users')
  OR public.has_permission(auth.uid(), 'sprints')
  OR public.has_permission(auth.uid(), 'painel_gp')
  OR public.has_permission(auth.uid(), 'squads')
);