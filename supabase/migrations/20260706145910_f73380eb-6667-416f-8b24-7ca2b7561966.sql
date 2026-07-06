
-- access_groups SELECT
DROP POLICY IF EXISTS "Authenticated users can read access_groups" ON public.access_groups;
CREATE POLICY "Admins can read access_groups" ON public.access_groups
  FOR SELECT USING (public.has_permission(auth.uid(), 'users'));

-- profile_groups SELECT
DROP POLICY IF EXISTS "Authenticated users can read profile_groups" ON public.profile_groups;
CREATE POLICY "Admins can read profile_groups" ON public.profile_groups
  FOR SELECT USING (public.has_permission(auth.uid(), 'users'));

-- project_stakeholders SELECT
DROP POLICY IF EXISTS "Authenticated read project_stakeholders" ON public.project_stakeholders;
CREATE POLICY "Scoped read project_stakeholders" ON public.project_stakeholders
  FOR SELECT USING (
    public.has_permission(auth.uid(), 'users')
    OR public.has_permission(auth.uid(), 'project_context')
    OR public.has_permission(auth.uid(), 'painel_gp')
  );

-- team_members SELECT
DROP POLICY IF EXISTS "Authenticated users can read team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated read team_members" ON public.team_members;
CREATE POLICY "Scoped read team_members" ON public.team_members
  FOR SELECT USING (
    public.has_permission(auth.uid(), 'users')
    OR public.has_permission(auth.uid(), 'team')
    OR public.has_permission(auth.uid(), 'sprints')
    OR public.has_permission(auth.uid(), 'painel_gp')
    OR public.has_permission(auth.uid(), 'squads')
  );

-- backlogs mutations
DROP POLICY IF EXISTS "Authenticated users can insert backlogs" ON public.backlogs;
DROP POLICY IF EXISTS "Authenticated users can update backlogs" ON public.backlogs;
DROP POLICY IF EXISTS "Authenticated users can delete backlogs" ON public.backlogs;
CREATE POLICY "Backlog managers can insert backlogs" ON public.backlogs
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can update backlogs" ON public.backlogs
  FOR UPDATE USING (public.has_permission(auth.uid(), 'backlogs'))
  WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can delete backlogs" ON public.backlogs
  FOR DELETE USING (public.has_permission(auth.uid(), 'backlogs'));

-- backlog_sub_items mutations
DROP POLICY IF EXISTS "Authenticated users can insert sub_items" ON public.backlog_sub_items;
DROP POLICY IF EXISTS "Authenticated users can update sub_items" ON public.backlog_sub_items;
DROP POLICY IF EXISTS "Authenticated users can delete sub_items" ON public.backlog_sub_items;
CREATE POLICY "Backlog managers can insert sub_items" ON public.backlog_sub_items
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can update sub_items" ON public.backlog_sub_items
  FOR UPDATE USING (public.has_permission(auth.uid(), 'backlogs'))
  WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can delete sub_items" ON public.backlog_sub_items
  FOR DELETE USING (public.has_permission(auth.uid(), 'backlogs'));

-- backlog_phase_history mutations
DROP POLICY IF EXISTS "Authenticated users can insert phase_history" ON public.backlog_phase_history;
DROP POLICY IF EXISTS "Authenticated users can update phase_history" ON public.backlog_phase_history;
DROP POLICY IF EXISTS "Authenticated users can delete phase_history" ON public.backlog_phase_history;
CREATE POLICY "Backlog managers can insert phase_history" ON public.backlog_phase_history
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can update phase_history" ON public.backlog_phase_history
  FOR UPDATE USING (public.has_permission(auth.uid(), 'backlogs'))
  WITH CHECK (public.has_permission(auth.uid(), 'backlogs'));
CREATE POLICY "Backlog managers can delete phase_history" ON public.backlog_phase_history
  FOR DELETE USING (public.has_permission(auth.uid(), 'backlogs'));

-- Helper predicate inlined: sprints/painel_gp perms
-- sprint_backlog_items
DROP POLICY IF EXISTS "Authenticated users can insert sprint_backlog_items" ON public.sprint_backlog_items;
DROP POLICY IF EXISTS "Authenticated users can update sprint_backlog_items" ON public.sprint_backlog_items;
DROP POLICY IF EXISTS "Authenticated users can delete sprint_backlog_items" ON public.sprint_backlog_items;
CREATE POLICY "Sprint managers insert sprint_backlog_items" ON public.sprint_backlog_items
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update sprint_backlog_items" ON public.sprint_backlog_items
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete sprint_backlog_items" ON public.sprint_backlog_items
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- sprint_members
DROP POLICY IF EXISTS "Authenticated users can insert sprint_members" ON public.sprint_members;
DROP POLICY IF EXISTS "Authenticated users can update sprint_members" ON public.sprint_members;
DROP POLICY IF EXISTS "Authenticated users can delete sprint_members" ON public.sprint_members;
CREATE POLICY "Sprint managers insert sprint_members" ON public.sprint_members
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update sprint_members" ON public.sprint_members
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete sprint_members" ON public.sprint_members
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- sprint_products
DROP POLICY IF EXISTS "Authenticated users can insert sprint_products" ON public.sprint_products;
DROP POLICY IF EXISTS "Authenticated users can update sprint_products" ON public.sprint_products;
DROP POLICY IF EXISTS "Authenticated users can delete sprint_products" ON public.sprint_products;
CREATE POLICY "Sprint managers insert sprint_products" ON public.sprint_products
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update sprint_products" ON public.sprint_products
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete sprint_products" ON public.sprint_products
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- sprint_unavailabilities
DROP POLICY IF EXISTS "Authenticated users can insert sprint_unavailabilities" ON public.sprint_unavailabilities;
DROP POLICY IF EXISTS "Authenticated users can update sprint_unavailabilities" ON public.sprint_unavailabilities;
DROP POLICY IF EXISTS "Authenticated users can delete sprint_unavailabilities" ON public.sprint_unavailabilities;
CREATE POLICY "Sprint managers insert sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete sprint_unavailabilities" ON public.sprint_unavailabilities
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- sprint_diary_entries
DROP POLICY IF EXISTS "Authenticated users can insert sprint_diary_entries" ON public.sprint_diary_entries;
DROP POLICY IF EXISTS "Authenticated users can update sprint_diary_entries" ON public.sprint_diary_entries;
DROP POLICY IF EXISTS "Authenticated users can delete sprint_diary_entries" ON public.sprint_diary_entries;
CREATE POLICY "Sprint managers insert sprint_diary_entries" ON public.sprint_diary_entries
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update sprint_diary_entries" ON public.sprint_diary_entries
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete sprint_diary_entries" ON public.sprint_diary_entries
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- coordinator_tasks
DROP POLICY IF EXISTS "Authenticated can insert coordinator_tasks" ON public.coordinator_tasks;
DROP POLICY IF EXISTS "Authenticated can update coordinator_tasks" ON public.coordinator_tasks;
DROP POLICY IF EXISTS "Authenticated can delete coordinator_tasks" ON public.coordinator_tasks;
CREATE POLICY "Sprint managers insert coordinator_tasks" ON public.coordinator_tasks
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers update coordinator_tasks" ON public.coordinator_tasks
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Sprint managers delete coordinator_tasks" ON public.coordinator_tasks
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- daily_status
DROP POLICY IF EXISTS "Authenticated users can insert daily_status" ON public.daily_status;
DROP POLICY IF EXISTS "Authenticated users can update daily_status" ON public.daily_status;
DROP POLICY IF EXISTS "Authenticated users can delete daily_status" ON public.daily_status;
CREATE POLICY "Panel managers insert daily_status" ON public.daily_status
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers update daily_status" ON public.daily_status
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers delete daily_status" ON public.daily_status
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- daily_meetings
DROP POLICY IF EXISTS "auth insert daily_meetings" ON public.daily_meetings;
DROP POLICY IF EXISTS "auth update daily_meetings" ON public.daily_meetings;
DROP POLICY IF EXISTS "auth delete daily_meetings" ON public.daily_meetings;
CREATE POLICY "Panel managers insert daily_meetings" ON public.daily_meetings
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers update daily_meetings" ON public.daily_meetings
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers delete daily_meetings" ON public.daily_meetings
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- daily_meeting_attendance
DROP POLICY IF EXISTS "auth insert daily_meeting_attendance" ON public.daily_meeting_attendance;
DROP POLICY IF EXISTS "auth update daily_meeting_attendance" ON public.daily_meeting_attendance;
DROP POLICY IF EXISTS "auth delete daily_meeting_attendance" ON public.daily_meeting_attendance;
CREATE POLICY "Panel managers insert daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers update daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers delete daily_meeting_attendance" ON public.daily_meeting_attendance
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- daily_bottleneck_resolutions
DROP POLICY IF EXISTS "Authenticated insert bottleneck resolutions" ON public.daily_bottleneck_resolutions;
DROP POLICY IF EXISTS "Authenticated update bottleneck resolutions" ON public.daily_bottleneck_resolutions;
DROP POLICY IF EXISTS "Authenticated delete bottleneck resolutions" ON public.daily_bottleneck_resolutions;
CREATE POLICY "Panel managers insert bottleneck resolutions" ON public.daily_bottleneck_resolutions
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers update bottleneck resolutions" ON public.daily_bottleneck_resolutions
  FOR UPDATE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'))
  WITH CHECK (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));
CREATE POLICY "Panel managers delete bottleneck resolutions" ON public.daily_bottleneck_resolutions
  FOR DELETE USING (public.has_permission(auth.uid(),'sprints') OR public.has_permission(auth.uid(),'painel_gp'));

-- squad_members
DROP POLICY IF EXISTS "Authenticated users can insert squad_members" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated users can delete squad_members" ON public.squad_members;
DROP POLICY IF EXISTS "Authenticated users can update squad_members" ON public.squad_members;
CREATE POLICY "Squad managers insert squad_members" ON public.squad_members
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'squads') OR public.has_permission(auth.uid(),'users'));
CREATE POLICY "Squad managers delete squad_members" ON public.squad_members
  FOR DELETE USING (public.has_permission(auth.uid(),'squads') OR public.has_permission(auth.uid(),'users'));

-- squad_products
DROP POLICY IF EXISTS "Authenticated users can insert squad_products" ON public.squad_products;
DROP POLICY IF EXISTS "Authenticated users can delete squad_products" ON public.squad_products;
DROP POLICY IF EXISTS "Authenticated users can update squad_products" ON public.squad_products;
CREATE POLICY "Squad managers insert squad_products" ON public.squad_products
  FOR INSERT WITH CHECK (public.has_permission(auth.uid(),'squads') OR public.has_permission(auth.uid(),'users'));
CREATE POLICY "Squad managers delete squad_products" ON public.squad_products
  FOR DELETE USING (public.has_permission(auth.uid(),'squads') OR public.has_permission(auth.uid(),'users'));
