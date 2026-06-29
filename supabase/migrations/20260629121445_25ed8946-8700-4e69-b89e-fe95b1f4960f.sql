
-- 1) Lock down SECURITY DEFINER function not meant to be called by app users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) activity_history: DELETE policy must apply to authenticated role only
DROP POLICY IF EXISTS "Admins or author can delete activity_history" ON public.activity_history;
CREATE POLICY "Admins or author can delete activity_history"
ON public.activity_history
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'users') OR changed_by = auth.uid());

-- Tighten INSERT (was WITH CHECK true) to author or admin
DROP POLICY IF EXISTS "Authenticated can insert activity_history" ON public.activity_history;
CREATE POLICY "Authenticated can insert activity_history"
ON public.activity_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users') OR changed_by = auth.uid());

-- 3) client_contacts: restrict SELECT to admins (also removes PII broadcast over realtime)
DROP POLICY IF EXISTS "Authenticated users can read client_contacts" ON public.client_contacts;
CREATE POLICY "Admins can read client_contacts"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (public.has_permission(auth.uid(), 'users'));

-- 4) dev_daily_entries: restrict mutations to owner (or admin)
DROP POLICY IF EXISTS "auth delete dev_daily_entries" ON public.dev_daily_entries;
CREATE POLICY "Owner or admin can delete dev_daily_entries"
ON public.dev_daily_entries
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users'));

DROP POLICY IF EXISTS "auth update dev_daily_entries" ON public.dev_daily_entries;
CREATE POLICY "Owner or admin can update dev_daily_entries"
ON public.dev_daily_entries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users'))
WITH CHECK (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users'));

DROP POLICY IF EXISTS "auth insert dev_daily_entries" ON public.dev_daily_entries;
CREATE POLICY "Owner can insert dev_daily_entries"
ON public.dev_daily_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5) password_change_logs: only admins can insert audit rows
DROP POLICY IF EXISTS "Authenticated can insert password_change_logs" ON public.password_change_logs;
CREATE POLICY "Admins can insert password_change_logs"
ON public.password_change_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users'));

-- 6) products: restrict mutations to admins
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'))
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'));

-- 7) sprints: restrict mutations to admins
DROP POLICY IF EXISTS "Authenticated users can insert sprints" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Authenticated users can delete sprints" ON public.sprints;
CREATE POLICY "Admins can insert sprints"
ON public.sprints
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update sprints"
ON public.sprints
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'))
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete sprints"
ON public.sprints
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'));

-- 8) squads: restrict mutations to admins
DROP POLICY IF EXISTS "Authenticated insert squads" ON public.squads;
DROP POLICY IF EXISTS "Authenticated update squads" ON public.squads;
DROP POLICY IF EXISTS "Authenticated delete squads" ON public.squads;
CREATE POLICY "Admins can insert squads"
ON public.squads
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can update squads"
ON public.squads
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'))
WITH CHECK (public.has_permission(auth.uid(), 'users'));
CREATE POLICY "Admins can delete squads"
ON public.squads
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'users'));
