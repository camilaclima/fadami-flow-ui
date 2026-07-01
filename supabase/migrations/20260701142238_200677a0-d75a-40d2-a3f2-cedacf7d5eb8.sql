
-- 1) has_permission: SECURITY INVOKER (fixes SUPA_authenticated_security_definer_function_executable)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
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

-- 2) activity_history INSERT: enforce changed_by = auth.uid() strictly
DROP POLICY IF EXISTS "Authenticated can insert activity_history" ON public.activity_history;
CREATE POLICY "Authenticated can insert activity_history"
  ON public.activity_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 3) Remove client_contacts from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.client_contacts;

-- 4) Tighten always-true INSERT/UPDATE/DELETE policies from literal `true`
--    to `auth.uid() IS NOT NULL` (behavior-preserving; satisfies linter 0024)

-- backlogs
DROP POLICY IF EXISTS "Authenticated users can insert backlogs" ON public.backlogs;
CREATE POLICY "Authenticated users can insert backlogs" ON public.backlogs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update backlogs" ON public.backlogs;
CREATE POLICY "Authenticated users can update backlogs" ON public.backlogs
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete backlogs" ON public.backlogs;
CREATE POLICY "Authenticated users can delete backlogs" ON public.backlogs
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- backlog_phase_history
DROP POLICY IF EXISTS "Authenticated users can insert phase_history" ON public.backlog_phase_history;
CREATE POLICY "Authenticated users can insert phase_history" ON public.backlog_phase_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update phase_history" ON public.backlog_phase_history;
CREATE POLICY "Authenticated users can update phase_history" ON public.backlog_phase_history
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete phase_history" ON public.backlog_phase_history;
CREATE POLICY "Authenticated users can delete phase_history" ON public.backlog_phase_history
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- backlog_sub_items
DROP POLICY IF EXISTS "Authenticated users can insert sub_items" ON public.backlog_sub_items;
CREATE POLICY "Authenticated users can insert sub_items" ON public.backlog_sub_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update sub_items" ON public.backlog_sub_items;
CREATE POLICY "Authenticated users can update sub_items" ON public.backlog_sub_items
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete sub_items" ON public.backlog_sub_items;
CREATE POLICY "Authenticated users can delete sub_items" ON public.backlog_sub_items
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- coordinator_tasks
DROP POLICY IF EXISTS "Authenticated can insert coordinator_tasks" ON public.coordinator_tasks;
CREATE POLICY "Authenticated can insert coordinator_tasks" ON public.coordinator_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update coordinator_tasks" ON public.coordinator_tasks;
CREATE POLICY "Authenticated can update coordinator_tasks" ON public.coordinator_tasks
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete coordinator_tasks" ON public.coordinator_tasks;
CREATE POLICY "Authenticated can delete coordinator_tasks" ON public.coordinator_tasks
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- daily_bottleneck_resolutions
DROP POLICY IF EXISTS "Authenticated insert bottleneck resolutions" ON public.daily_bottleneck_resolutions;
CREATE POLICY "Authenticated insert bottleneck resolutions" ON public.daily_bottleneck_resolutions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated delete bottleneck resolutions" ON public.daily_bottleneck_resolutions;
CREATE POLICY "Authenticated delete bottleneck resolutions" ON public.daily_bottleneck_resolutions
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- daily_meetings
DROP POLICY IF EXISTS "auth insert daily_meetings" ON public.daily_meetings;
CREATE POLICY "auth insert daily_meetings" ON public.daily_meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update daily_meetings" ON public.daily_meetings;
CREATE POLICY "auth update daily_meetings" ON public.daily_meetings
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth delete daily_meetings" ON public.daily_meetings;
CREATE POLICY "auth delete daily_meetings" ON public.daily_meetings
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- daily_meeting_attendance
DROP POLICY IF EXISTS "auth insert daily_meeting_attendance" ON public.daily_meeting_attendance;
CREATE POLICY "auth insert daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update daily_meeting_attendance" ON public.daily_meeting_attendance;
CREATE POLICY "auth update daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth delete daily_meeting_attendance" ON public.daily_meeting_attendance;
CREATE POLICY "auth delete daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- daily_status
DROP POLICY IF EXISTS "Authenticated users can insert daily_status" ON public.daily_status;
CREATE POLICY "Authenticated users can insert daily_status" ON public.daily_status
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update daily_status" ON public.daily_status;
CREATE POLICY "Authenticated users can update daily_status" ON public.daily_status
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete daily_status" ON public.daily_status;
CREATE POLICY "Authenticated users can delete daily_status" ON public.daily_status
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- project_backlog_items
DROP POLICY IF EXISTS "Authenticated users can insert project_backlog_items" ON public.project_backlog_items;
CREATE POLICY "Authenticated users can insert project_backlog_items" ON public.project_backlog_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update project_backlog_items" ON public.project_backlog_items;
CREATE POLICY "Authenticated users can update project_backlog_items" ON public.project_backlog_items
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete project_backlog_items" ON public.project_backlog_items;
CREATE POLICY "Authenticated users can delete project_backlog_items" ON public.project_backlog_items
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- project_contexts
DROP POLICY IF EXISTS "Authenticated users can insert project_contexts" ON public.project_contexts;
CREATE POLICY "Authenticated users can insert project_contexts" ON public.project_contexts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update project_contexts" ON public.project_contexts;
CREATE POLICY "Authenticated users can update project_contexts" ON public.project_contexts
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete project_contexts" ON public.project_contexts;
CREATE POLICY "Authenticated users can delete project_contexts" ON public.project_contexts
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sprint_backlog_items
DROP POLICY IF EXISTS "Authenticated users can insert sprint_backlog_items" ON public.sprint_backlog_items;
CREATE POLICY "Authenticated users can insert sprint_backlog_items" ON public.sprint_backlog_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update sprint_backlog_items" ON public.sprint_backlog_items;
CREATE POLICY "Authenticated users can update sprint_backlog_items" ON public.sprint_backlog_items
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete sprint_backlog_items" ON public.sprint_backlog_items;
CREATE POLICY "Authenticated users can delete sprint_backlog_items" ON public.sprint_backlog_items
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sprint_diary_entries
DROP POLICY IF EXISTS "Authenticated users can insert sprint_diary_entries" ON public.sprint_diary_entries;
CREATE POLICY "Authenticated users can insert sprint_diary_entries" ON public.sprint_diary_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update sprint_diary_entries" ON public.sprint_diary_entries;
CREATE POLICY "Authenticated users can update sprint_diary_entries" ON public.sprint_diary_entries
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete sprint_diary_entries" ON public.sprint_diary_entries;
CREATE POLICY "Authenticated users can delete sprint_diary_entries" ON public.sprint_diary_entries
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sprint_members
DROP POLICY IF EXISTS "Authenticated users can insert sprint_members" ON public.sprint_members;
CREATE POLICY "Authenticated users can insert sprint_members" ON public.sprint_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update sprint_members" ON public.sprint_members;
CREATE POLICY "Authenticated users can update sprint_members" ON public.sprint_members
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete sprint_members" ON public.sprint_members;
CREATE POLICY "Authenticated users can delete sprint_members" ON public.sprint_members
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sprint_products
DROP POLICY IF EXISTS "Authenticated insert sprint_products" ON public.sprint_products;
CREATE POLICY "Authenticated insert sprint_products" ON public.sprint_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated update sprint_products" ON public.sprint_products;
CREATE POLICY "Authenticated update sprint_products" ON public.sprint_products
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated delete sprint_products" ON public.sprint_products;
CREATE POLICY "Authenticated delete sprint_products" ON public.sprint_products
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sprint_unavailabilities
DROP POLICY IF EXISTS "Authenticated users can insert sprint_unavailabilities" ON public.sprint_unavailabilities;
CREATE POLICY "Authenticated users can insert sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update sprint_unavailabilities" ON public.sprint_unavailabilities;
CREATE POLICY "Authenticated users can update sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete sprint_unavailabilities" ON public.sprint_unavailabilities;
CREATE POLICY "Authenticated users can delete sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- squad_members
DROP POLICY IF EXISTS "Authenticated insert squad_members" ON public.squad_members;
CREATE POLICY "Authenticated insert squad_members" ON public.squad_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated delete squad_members" ON public.squad_members;
CREATE POLICY "Authenticated delete squad_members" ON public.squad_members
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- squad_products
DROP POLICY IF EXISTS "Authenticated insert squad_products" ON public.squad_products;
CREATE POLICY "Authenticated insert squad_products" ON public.squad_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated delete squad_products" ON public.squad_products;
CREATE POLICY "Authenticated delete squad_products" ON public.squad_products
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- team_member_products
DROP POLICY IF EXISTS "Authenticated insert team_member_products" ON public.team_member_products;
CREATE POLICY "Authenticated insert team_member_products" ON public.team_member_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated update team_member_products" ON public.team_member_products;
CREATE POLICY "Authenticated update team_member_products" ON public.team_member_products
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated delete team_member_products" ON public.team_member_products;
CREATE POLICY "Authenticated delete team_member_products" ON public.team_member_products
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
