import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StakeholderImportance = "low" | "medium" | "high" | "critical";

export interface Stakeholder {
  id: string;
  product_id: string;
  name: string;
  contact: string;
  area: string;
  email: string;
  phone: string;
  concession: string;
  importance: StakeholderImportance;
  created_at: string;
  updated_at: string;
}

export const IMPORTANCE_LABELS: Record<StakeholderImportance, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const IMPORTANCE_STYLES: Record<StakeholderImportance, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  high: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  critical: "bg-destructive/15 text-destructive border-destructive/20",
};

export function useStakeholders() {
  return useQuery({
    queryKey: ["project_stakeholders"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_stakeholders" as any) as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Stakeholder[];
    },
  });
}

export function useSaveStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<Stakeholder> & { product_id: string; name: string }) => {
      if (s.id) {
        const { id, ...rest } = s;
        const { error } = await (supabase.from("project_stakeholders" as any) as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("project_stakeholders" as any) as any).insert(s);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_stakeholders"] });
      toast.success("Stakeholder salvo!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("project_stakeholders" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_stakeholders"] });
      toast.success("Stakeholder removido");
    },
  });
}