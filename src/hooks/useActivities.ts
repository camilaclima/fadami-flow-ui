import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActivityImpact = "critical" | "high" | "medium" | "low";
export type ActivityStatus = "todo" | "in_progress" | "blocked" | "done";

export interface Activity {
  id: string;
  product_id: string;
  task: string;
  category: string;
  deadline: string;
  deadline_date: string | null;
  impact: ActivityImpact;
  status: ActivityStatus;
  sprint_id: string | null;
  dependency_id: string | null;
  responsible_id: string | null;
  responsible_ids: string[];
  description: string;
  likely_owner: string;
  risk_mitigation: string;
  approved: boolean;
  sort_order: number;
  project_context_id: string | null;
  created_at: string;
  updated_at: string;
}

export const IMPACT_LABELS: Record<ActivityImpact, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  blocked: "Impedido",
  done: "Concluído",
};

export function useActivities(productIds: string[] | null) {
  return useQuery({
    queryKey: ["activities", productIds ?? "all"],
    queryFn: async () => {
      let q = (supabase.from("project_backlog_items") as any).select("*");
      if (productIds) {
        if (productIds.length === 0) return [] as Activity[];
        q = q.in("product_id", productIds);
      }
      const { data, error } = await q.order("deadline_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });
}

export type NewActivityInput = {
  product_id: string;
  task: string;
  deadline_date: string | null;
  impact: ActivityImpact;
  sprint_id: string | null;
  dependency_id: string | null;
  responsible_ids?: string[];
  description?: string;
  status?: ActivityStatus;
};

export function useAddActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewActivityInput) => {
      const payload: any = {
        product_id: input.product_id,
        task: input.task,
        deadline_date: input.deadline_date,
        deadline: input.deadline_date ?? "",
        impact: input.impact,
        sprint_id: input.sprint_id,
        dependency_id: input.dependency_id,
        responsible_ids: input.responsible_ids ?? [],
        responsible_id: input.responsible_ids?.[0] ?? null,
        description: input.description ?? "",
        status: input.status ?? "todo",
        category: "",
        likely_owner: "",
        risk_mitigation: "",
        approved: false,
        sort_order: 0,
      };
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as Activity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade criada!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar atividade"),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Activity>) => {
      // Fetch current values to compute diff for history
      const { data: before } = await (supabase.from("project_backlog_items") as any)
        .select("*").eq("id", id).maybeSingle();
      const { error } = await (supabase.from("project_backlog_items") as any).update(patch).eq("id", id);
      if (error) throw error;
      // Build diff
      const changes: Record<string, { old: any; new: any }> = {};
      if (before) {
        for (const k of Object.keys(patch)) {
          const ov = (before as any)[k];
          const nv = (patch as any)[k];
          if (JSON.stringify(ov) !== JSON.stringify(nv)) changes[k] = { old: ov, new: nv };
        }
      }
      if (Object.keys(changes).length > 0) {
        const { data: u } = await supabase.auth.getUser();
        await (supabase.from("activity_history") as any).insert({
          activity_id: id,
          changed_by: u?.user?.id ?? null,
          changed_by_email: u?.user?.email ?? "",
          changes,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["activity_history", vars.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });
}

export interface ActivityHistoryEntry {
  id: string;
  activity_id: string;
  changed_by: string | null;
  changed_by_email: string;
  changes: Record<string, { old: any; new: any }>;
  created_at: string;
}

export function useActivityHistory(activityId: string | null | undefined) {
  return useQuery({
    queryKey: ["activity_history", activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("activity_history") as any)
        .select("*").eq("activity_id", activityId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityHistoryEntry[];
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("project_backlog_items") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade removida");
    },
  });
}