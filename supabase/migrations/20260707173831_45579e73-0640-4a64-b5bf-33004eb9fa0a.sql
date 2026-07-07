
-- Fix has_permission recursion: run as definer to bypass RLS on lookup tables
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.profile_groups pg ON pg.profile_id = p.id
    LEFT JOIN public.access_groups ag ON ag.id = pg.group_id OR ag.id = p.group_id
    WHERE p.user_id = _user_id
      AND ag.permissions ? _perm
  );
$function$;

-- Allow authenticated users to read their own group memberships and the groups they belong to,
-- so the client can resolve their permissions without needing the 'users' admin permission.
CREATE POLICY "Users can read own profile_groups"
ON public.profile_groups
FOR SELECT
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can read own access_groups"
ON public.access_groups
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT pg.group_id
    FROM public.profile_groups pg
    JOIN public.profiles p ON p.id = pg.profile_id
    WHERE p.user_id = auth.uid()
  )
  OR id IN (SELECT group_id FROM public.profiles WHERE user_id = auth.uid())
);
