
-- Tighten SELECT on clients to only users with operational permissions that legitimately need client directory data (emails/phones), instead of every authenticated user.
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
CREATE POLICY "Users with relevant permissions can read clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'clients')
  OR has_permission(auth.uid(), 'users')
  OR has_permission(auth.uid(), 'backlogs')
  OR has_permission(auth.uid(), 'sprints')
  OR has_permission(auth.uid(), 'painel_gp')
  OR has_permission(auth.uid(), 'team')
  OR has_permission(auth.uid(), 'team_project_config')
  OR has_permission(auth.uid(), 'controle_gestao')
  OR has_permission(auth.uid(), 'project_context')
  OR has_permission(auth.uid(), 'dashboard')
);
