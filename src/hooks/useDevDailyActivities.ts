import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityStatus = "pendente" | "concluida" | "inativa";

export interface DevDailyActivity {
  id: string;
  user_id: string;
  squad_id: string | null;
  description: string;
  status: ActivityStatus;
  created_entry_id: string | null;
  closed_entry_id: string | null;
  completed_at: string | null;
  inactivated_at: string | null;
  dev_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Todas as atividades do dev (usado para carry-over e histórico). */
export function useDevDailyActivitiesByUser(userId: string | null) {
  return useQuery({
    queryKey: ["dev_daily_activities", "by-user", userId ?? "none"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_activities") as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DevDailyActivity[];
    },
  });
}

/** Atividades vinculadas a uma lista de entries (para painéis do GP/Histórico). */
export function useDevDailyActivitiesByEntries(entryIds: string[]) {
  return useQuery({
    queryKey: ["dev_daily_activities", "by-entries", [...entryIds].sort().join(",")],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_activities") as any)
        .select("*")
        .or(
          `created_entry_id.in.(${entryIds.join(",")}),closed_entry_id.in.(${entryIds.join(",")})`
        );
      if (error) throw error;
      return (data ?? []) as DevDailyActivity[];
    },
  });
}

export function useDevDailyActivityMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dev_daily_activities"] });

  const create = useMutation({
    mutationFn: async (input: {
      user_id: string;
      squad_id: string | null;
      description: string;
      status?: ActivityStatus;
      created_entry_id: string;
      closed_entry_id?: string | null;
      completed_at?: string | null;
      dev_notes?: string | null;
    }) => {
      const payload: any = {
        user_id: input.user_id,
        squad_id: input.squad_id,
        description: input.description,
        status: input.status ?? "pendente",
        created_entry_id: input.created_entry_id,
        closed_entry_id: input.closed_entry_id ?? null,
        completed_at: input.completed_at ?? null,
        dev_notes: input.dev_notes ?? null,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await (supabase.from("dev_daily_activities") as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return { id: (data as any)?.id as string };
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar atividade"),
  });

  const markCompleted = useMutation({
    mutationFn: async (input: { id: string; closed_entry_id: string }) => {
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update({
          status: "concluida",
          completed_at: new Date().toISOString(),
          inactivated_at: null,
          closed_entry_id: input.closed_entry_id,
          updated_by: user?.id ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao concluir atividade"),
  });

  const markInactive = useMutation({
    mutationFn: async (input: { id: string; closed_entry_id: string }) => {
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update({
          status: "inativa",
          inactivated_at: new Date().toISOString(),
          completed_at: null,
          closed_entry_id: input.closed_entry_id,
          updated_by: user?.id ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao inativar atividade"),
  });

  const revertPending = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update({
          status: "pendente",
          completed_at: null,
          inactivated_at: null,
          closed_entry_id: null,
          updated_by: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar atividade"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover atividade"),
  });

  const updateNote = useMutation({
    mutationFn: async (input: { id: string; dev_notes: string | null }) => {
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update({ dev_notes: input.dev_notes, updated_by: user?.id ?? null })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar observação"),
  });

  return { create, markCompleted, markInactive, revertPending, remove, updateNote };
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  inativa: "Inativada",
};

export const ACTIVITY_STATUS_STYLES: Record<ActivityStatus, string> = {
  pendente: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  concluida: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  inativa: "bg-muted text-muted-foreground border-border",
};