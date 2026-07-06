import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type ImpedimentUrgency = "low" | "medium" | "high";

export interface DevDailyImpediment {
  id: string;
  entry_id: string;
  description: string;
  urgency: ImpedimentUrgency;
  resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

/** Lista todos os impedimentos das entries fornecidas. */
export function useDevDailyImpedimentsByEntries(entryIds: string[]) {
  return useQuery({
    queryKey: ["dev_daily_impediments", "by-entries", [...entryIds].sort().join(",")], staleTime: 1000 * 60,
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_impediments") as any)
        .select("*")
        .in("entry_id", entryIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DevDailyImpediment[];
    },
  });
}

export function useImpedimentMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dev_daily_impediments"] });
    qc.invalidateQueries({ queryKey: ["dev_daily_entries"] });
  };

  const create = useMutation({
    mutationFn: async (input: {
      entry_id: string;
      description: string;
      urgency: ImpedimentUrgency;
    }) => {
      const { error } = await (supabase.from("dev_daily_impediments") as any).insert({
        entry_id: input.entry_id,
        description: input.description,
        urgency: input.urgency,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar impedimento"),
  });

  const resolve = useMutation({
    mutationFn: async (input: {
      id: string;
      resolved: boolean;
      resolution_note?: string | null;
    }) => {
      const payload: any = {
        resolved: input.resolved,
        resolution_note: input.resolution_note ?? null,
        resolved_at: input.resolved ? new Date().toISOString() : null,
        updated_by: user?.id ?? null,
      };
      const { error } = await (supabase.from("dev_daily_impediments") as any)
        .update(payload)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar impedimento"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("dev_daily_impediments") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover impedimento"),
  });

  return { create, resolve, remove };
}

export const URGENCY_LABELS: Record<ImpedimentUrgency, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const URGENCY_STYLES: Record<ImpedimentUrgency, string> = {
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};