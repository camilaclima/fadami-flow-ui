import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Sprint, SprintMember, SprintUnavailability, SprintBacklogItem } from "@/types/sprint";

export function useSprints() {
  return useQuery({
    queryKey: ["sprints"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprints") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sprint[];
    },
  });
}

export function useSprintMembers(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint_members", sprintId],
    enabled: !!sprintId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_members") as any)
        .select("*")
        .eq("sprint_id", sprintId!);
      if (error) throw error;
      return data as SprintMember[];
    },
  });
}
export function useSprintUnavailabilities(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint_unavailabilities", sprintId],
    enabled: !!sprintId,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_unavailabilities") as any)
        .select("*, sprint_members!inner(sprint_id)")
        .eq("sprint_members.sprint_id", sprintId!);
      if (error) throw error;
      return data as SprintUnavailability[];
    },
  });
}
export function useSprintBacklogItems(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint_backlog_items", sprintId],
    enabled: !!sprintId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_backlog_items") as any)
        .select("*")
        .eq("sprint_id", sprintId!);
      if (error) throw error;
      return data as SprintBacklogItem[];
    },
  });
}

export function useAddSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sprint: Omit<Sprint, "id" | "created_at" | "diary">) => {
      const { data, error } = await (supabase.from("sprints") as any)
        .insert(sprint)
        .select()
        .single();
      if (error) throw error;
      return data as Sprint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("Sprint criada!");
    },
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Sprint>) => {
      const { error } = await (supabase.from("sprints") as any).update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("Sprint atualizada!");
    },
  });
}

export function useDeleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("sprints") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("Sprint removida!");
    },
  });
}

export function useAddSprintMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sprint_id: string; team_member_id: string }) => {
      const { data: result, error } = await (supabase.from("sprint_members") as any)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result as SprintMember;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sprint_members", vars.sprint_id] });
    },
  });
}

export function useRemoveSprintMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sprintId }: { id: string; sprintId: string }) => {
      const { error } = await (supabase.from("sprint_members") as any).delete().eq("id", id);
      if (error) throw error;
      return sprintId;
    },
    onSuccess: (sprintId) => {
      qc.invalidateQueries({ queryKey: ["sprint_members", sprintId] });
    },
  });
}

export function useAddSprintUnavailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SprintUnavailability, "id">) => {
      const { error } = await (supabase.from("sprint_unavailabilities") as any).insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint_unavailabilities"] });
    },
  });
}

export function useDeleteSprintUnavailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("sprint_unavailabilities") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint_unavailabilities"] });
    },
  });
}

export function useAddSprintBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SprintBacklogItem, "id" | "created_at" | "actual_hours" | "checklist_questions" | "checklist_access" | "checklist_dependency" | "checklist_tools" | "impediment_text" | "impediment_deadline" | "deadline">) => {
      const { error } = await (supabase.from("sprint_backlog_items") as any).insert(data);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sprint_backlog_items", vars.sprint_id] });
      qc.invalidateQueries({ queryKey: ["backlogs"] });
    },
  });
}

export function useUpdateSprintBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sprintId, ...data }: { id: string; sprintId: string } & Partial<SprintBacklogItem>) => {
      const { error } = await (supabase.from("sprint_backlog_items") as any).update(data).eq("id", id);
      if (error) throw error;
      return sprintId;
    },
    onSuccess: (sprintId) => {
      qc.invalidateQueries({ queryKey: ["sprint_backlog_items", sprintId] });
    },
  });
}

export function useRemoveSprintBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sprintId }: { id: string; sprintId: string }) => {
      const { error } = await (supabase.from("sprint_backlog_items") as any).delete().eq("id", id);
      if (error) throw error;
      return sprintId;
    },
    onSuccess: (sprintId) => {
      qc.invalidateQueries({ queryKey: ["sprint_backlog_items", sprintId] });
      qc.invalidateQueries({ queryKey: ["backlogs"] });
    },
  });
}

// --- Diary Entries ---

export interface SprintDiaryEntry {
  id: string;
  sprint_id: string;
  sprint_backlog_item_id: string | null;
  content: string;
  created_at: string;
  created_by: string;
}

export function useSprintDiaryEntries(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint_diary_entries", sprintId],
    enabled: !!sprintId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_diary_entries") as any)
        .select("*")
        .eq("sprint_id", sprintId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SprintDiaryEntry[];
    },
  });
}

export function useAddSprintDiaryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sprint_id: string; sprint_backlog_item_id?: string | null; content: string; created_by?: string }) => {
      const insertData: any = {
        sprint_id: data.sprint_id,
        content: data.content,
        created_by: data.created_by ?? "",
      };
      if (data.sprint_backlog_item_id && data.sprint_backlog_item_id !== "general") {
        insertData.sprint_backlog_item_id = data.sprint_backlog_item_id;
      }
      const { error } = await (supabase.from("sprint_diary_entries") as any).insert(insertData);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sprint_diary_entries", vars.sprint_id] });
    },
  });
}

/** Calculate business days between two dates */
export function getBusinessDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
