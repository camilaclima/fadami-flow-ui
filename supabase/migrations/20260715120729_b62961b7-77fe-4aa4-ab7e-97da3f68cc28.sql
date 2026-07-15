CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.profile_groups pg ON pg.profile_id = p.id
    JOIN public.access_groups ag ON ag.id = pg.group_id
    WHERE p.user_id = _user_id
      AND ag.permissions ? _perm
  );
$function$;