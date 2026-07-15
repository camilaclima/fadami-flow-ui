
-- Fix remaining always-true policy
DROP POLICY IF EXISTS "authenticated write profile_squads" ON public.profile_squads;

CREATE POLICY "Managers manage profile_squads"
ON public.profile_squads FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'squads') OR public.has_permission(auth.uid(), 'users'))
WITH CHECK (public.has_permission(auth.uid(), 'squads') OR public.has_permission(auth.uid(), 'users'));

-- Convert has_permission to SECURITY INVOKER (relies on existing RLS on profiles/profile_groups/access_groups)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
