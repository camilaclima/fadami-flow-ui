
-- 1) Fix impediments SELECT (dev_daily_impediments) - replace broad SELECT
DROP POLICY IF EXISTS "Users can view impediments from accessible dailies" ON public.dev_daily_impediments;
DROP POLICY IF EXISTS impediments_strict_policy ON public.dev_daily_impediments;

CREATE POLICY "View impediments (owner or squad leader or admin)"
ON public.dev_daily_impediments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dev_daily_entries e
    WHERE e.id = dev_daily_impediments.entry_id
      AND (
        e.user_id = auth.uid()
        OR public.has_permission(auth.uid(), 'users')
        OR public.has_permission(auth.uid(), 'painel_gp')
        OR EXISTS (
          SELECT 1
          FROM public.squad_members sm
          JOIN public.squad_leaders sl ON sm.squad_id = sl.squad_id
          JOIN public.team_members tm ON sm.team_member_id = tm.id
          WHERE tm.id = e.user_id AND sl.profile_id = auth.uid()
        )
      )
  )
);

-- 2) Remove user_metadata-based policies on profiles + dev_daily_entries
DROP POLICY IF EXISTS "Leitura restrita ao próprio dono ou admin" ON public.profiles;
DROP POLICY IF EXISTS profiles_strict_policy ON public.profiles;
DROP POLICY IF EXISTS dailies_strict_policy ON public.dev_daily_entries;

-- 3) squad_leaders: remove permissive ALL policy, add permission-scoped writes
DROP POLICY IF EXISTS "authenticated write squad_leaders" ON public.squad_leaders;

CREATE POLICY "Managers manage squad_leaders"
ON public.squad_leaders FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'squads') OR public.has_permission(auth.uid(), 'users'))
WITH CHECK (public.has_permission(auth.uid(), 'squads') OR public.has_permission(auth.uid(), 'users'));

-- 4) squad_members: drop broad writes (managers policy already exists)
DROP POLICY IF EXISTS "Authenticated insert squad_members" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated delete squad_members" ON public.squad_members;

-- 5) squad_products: drop broad writes
DROP POLICY IF EXISTS "Authenticated insert squad_products" ON public.squad_products;
DROP POLICY IF EXISTS "Authenticated delete squad_products" ON public.squad_products;

-- 6) sprint_products: drop broad writes
DROP POLICY IF EXISTS "Authenticated insert sprint_products" ON public.sprint_products;
DROP POLICY IF EXISTS "Authenticated update sprint_products" ON public.sprint_products;
DROP POLICY IF EXISTS "Authenticated delete sprint_products" ON public.sprint_products;

-- 7) team_member_products: drop broad writes, add permission-scoped
DROP POLICY IF EXISTS "Authenticated insert team_member_products" ON public.team_member_products;
DROP POLICY IF EXISTS "Authenticated update team_member_products" ON public.team_member_products;
DROP POLICY IF EXISTS "Authenticated delete team_member_products" ON public.team_member_products;

CREATE POLICY "Managers insert team_member_products"
ON public.team_member_products FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users') OR public.has_permission(auth.uid(), 'squads'));

CREATE POLICY "Managers update team_member_products"
ON public.team_member_products FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'users') OR public.has_permission(auth.uid(), 'squads'))
WITH CHECK (public.has_permission(auth.uid(), 'users') OR public.has_permission(auth.uid(), 'squads'));

CREATE POLICY "Managers delete team_member_products"
ON public.team_member_products FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'users') OR public.has_permission(auth.uid(), 'squads'));

-- 8) project_backlog_items: drop broad writes, add permission-scoped
DROP POLICY IF EXISTS "Authenticated users can insert project_backlog_items" ON public.project_backlog_items;
DROP POLICY IF EXISTS "Authenticated users can update project_backlog_items" ON public.project_backlog_items;
DROP POLICY IF EXISTS "Authenticated users can delete project_backlog_items" ON public.project_backlog_items;

CREATE POLICY "Managers insert project_backlog_items"
ON public.project_backlog_items FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'sprints'));

CREATE POLICY "Managers update project_backlog_items"
ON public.project_backlog_items FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'sprints'))
WITH CHECK (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'sprints'));

CREATE POLICY "Managers delete project_backlog_items"
ON public.project_backlog_items FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'sprints'));

-- 9) project_contexts: drop broad writes, add permission-scoped
DROP POLICY IF EXISTS "Authenticated users can insert project_contexts" ON public.project_contexts;
DROP POLICY IF EXISTS "Authenticated users can update project_contexts" ON public.project_contexts;
DROP POLICY IF EXISTS "Authenticated users can delete project_contexts" ON public.project_contexts;

CREATE POLICY "Managers insert project_contexts"
ON public.project_contexts FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'products'));

CREATE POLICY "Managers update project_contexts"
ON public.project_contexts FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'products'))
WITH CHECK (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'products'));

CREATE POLICY "Managers delete project_contexts"
ON public.project_contexts FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'backlogs') OR public.has_permission(auth.uid(), 'painel_gp') OR public.has_permission(auth.uid(), 'products'));

-- 10) Lock down SECURITY DEFINER trigger function from direct execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
