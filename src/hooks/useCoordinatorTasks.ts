import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncCoordinatorTaskToActivity } from "@/hooks/useActivities";

export type TaskCategory = "blocker" | "schedule_risk" | "activity" | "custom";
export type TaskUrgency = "critical" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "resolved";
export type TaskSource = "ai" | "manual";

export interface CoordinatorTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  urgency: TaskUrgency;
  source: TaskSource;
  status: TaskStatus;
  product_id: string | null;
  sprint_id: string | null;
  activity_id: string | null;
  daily_status_id: string | null;
  responsible_member_id: string | null;
  deadline_date: string | null;
  context_payload: any;
  ai_message: string;
  dedup_hash: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export function useCoordinatorTasks(productIds: string[] | null) {
  return useQuery({
    queryKey: ["coordinator_tasks", productIds ?? "all"],
    queryFn: async () => {
      let q = (supabase.from("coordinator_tasks") as any).select("*").order("created_at", { ascending: false });
      if (productIds) {
        if (productIds.length === 0) return [] as CoordinatorTask[];
        // include null product_id (custom tasks without project) as well
        q = q.or(`product_id.in.(${productIds.join(",")}),product_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CoordinatorTask[];
    },
  });
}

export function useGenerateAITasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: string[] | null) => {
      const { data, error } = await supabase.functions.invoke("generate-coordinator-tasks", {
        body: { productIds },
      });
      if (error) throw error;
      return data as { inserted: number; total_suggested: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["coordinator_tasks"] });
      toast.success(`IA gerou ${d.inserted} nova(s) ação(ões)`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao gerar ações com IA"),
  });
}

export function useResolveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase.from("coordinator_tasks") as any).update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: u?.user?.id ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coordinator_tasks"] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("coordinator_tasks") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coordinator_tasks"] }),
  });
}

export type NewTaskInput = Partial<CoordinatorTask> & { title: string; category: TaskCategory };

export function useUpsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTaskInput & { id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (input.id) {
        const { id, ...patch } = input;
        const { data, error } = await (supabase.from("coordinator_tasks") as any)
          .update({ ...patch, updated_by: u?.user?.id ?? null })
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        if (data?.category === "activity" && data?.product_id) {
          await syncCoordinatorTaskToActivity(data);
        }
        return id;
      }
      const { data, error } = await (supabase.from("coordinator_tasks") as any).insert({
        title: input.title,
        description: input.description ?? "",
        category: input.category,
        urgency: input.urgency ?? "medium",
        source: "manual",
        status: "pending",
        product_id: input.product_id ?? null,
        sprint_id: input.sprint_id ?? null,
        deadline_date: input.deadline_date ?? null,
        responsible_member_id: input.responsible_member_id ?? null,
        created_by: u?.user?.id ?? null,
      }).select("*").single();
      if (error) throw error;
      if (data?.category === "activity" && data?.product_id) {
        await syncCoordinatorTaskToActivity(data);
      }
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coordinator_tasks"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Tarefa salva!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
}