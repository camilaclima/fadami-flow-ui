DROP POLICY IF EXISTS "Admins can insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can update team_members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team_members" ON public.team_members;

CREATE POLICY "Insert team_members (admin or coordinator)"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'users') OR coordinator_id = auth.uid()
);

CREATE POLICY "Update team_members (admin or coordinator)"
ON public.team_members FOR UPDATE TO authenticated
USING (has_permission(auth.uid(), 'users') OR coordinator_id = auth.uid())
WITH CHECK (has_permission(auth.uid(), 'users') OR coordinator_id = auth.uid());

CREATE POLICY "Delete team_members (admin or coordinator)"
ON public.team_members FOR DELETE TO authenticated
USING (has_permission(auth.uid(), 'users') OR coordinator_id = auth.uid());