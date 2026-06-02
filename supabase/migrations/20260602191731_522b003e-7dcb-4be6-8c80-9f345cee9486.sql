
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.profile_groups pg ON pg.profile_id = p.id
    LEFT JOIN public.access_groups ag ON ag.id = pg.group_id OR ag.id = p.group_id
    WHERE p.user_id = _user_id
      AND ag.permissions ? _perm
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- access_groups
DROP POLICY IF EXISTS "Authenticated users can insert access_groups" ON public.access_groups;
DROP POLICY IF EXISTS "Authenticated users can update access_groups" ON public.access_groups;
DROP POLICY IF EXISTS "Authenticated users can delete access_groups" ON public.access_groups;
CREATE POLICY "Admins can insert access_groups" ON public.access_groups
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update access_groups" ON public.access_groups
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete access_groups" ON public.access_groups
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- roles
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON public.roles;
CREATE POLICY "Admins can insert roles" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update roles" ON public.roles
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete roles" ON public.roles
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- profile_groups
DROP POLICY IF EXISTS "Authenticated users can insert profile_groups" ON public.profile_groups;
DROP POLICY IF EXISTS "Authenticated users can delete profile_groups" ON public.profile_groups;
CREATE POLICY "Admins can insert profile_groups" ON public.profile_groups
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete profile_groups" ON public.profile_groups
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- profile_products
DROP POLICY IF EXISTS "Authenticated users can insert profile_products" ON public.profile_products;
DROP POLICY IF EXISTS "Authenticated users can delete profile_products" ON public.profile_products;
CREATE POLICY "Admins can insert profile_products" ON public.profile_products
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete profile_products" ON public.profile_products
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- profiles
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins or self can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'users') OR user_id = auth.uid())
  WITH CHECK (public.has_permission(auth.uid(), 'users') OR user_id = auth.uid());
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- team_members
DROP POLICY IF EXISTS "Authenticated users can insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can update team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team_members" ON public.team_members;
CREATE POLICY "Admins can insert team_members" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update team_members" ON public.team_members
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete team_members" ON public.team_members
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- clients
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
CREATE POLICY "Admins can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- client_contacts
DROP POLICY IF EXISTS "Authenticated users can insert client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Authenticated users can update client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins can insert client_contacts" ON public.client_contacts
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update client_contacts" ON public.client_contacts
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete client_contacts" ON public.client_contacts
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- project_stakeholders
DROP POLICY IF EXISTS "Authenticated insert project_stakeholders" ON public.project_stakeholders;
DROP POLICY IF EXISTS "Authenticated update project_stakeholders" ON public.project_stakeholders;
DROP POLICY IF EXISTS "Authenticated delete project_stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins insert project_stakeholders" ON public.project_stakeholders
  FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins update project_stakeholders" ON public.project_stakeholders
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'users'))
  WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins delete project_stakeholders" ON public.project_stakeholders
  FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- password_change_logs
DROP POLICY IF EXISTS "Authenticated can read password_change_logs" ON public.password_change_logs;
CREATE POLICY "Admins can read password_change_logs" ON public.password_change_logs
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'users'));

-- activity_history
DROP POLICY IF EXISTS "Authenticated can read activity_history" ON public.activity_history;
CREATE POLICY "Admins or author can read activity_history" ON public.activity_history
  FOR SELECT TO authenticated USING (
    public.has_permission(auth.uid(), 'users') OR changed_by = auth.uid()
  );
