import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface ExecutiveReport {
  id: string;
  period_start: string;
  period_end: string;
  title: string | null;
  content_text: string;
  sections: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; text: string; included: boolean; data?: any }>;
  }>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useExecutiveReports() {
  return useQuery({
    queryKey: ["executive_reports", "list"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_executive_reports") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExecutiveReport[];
    },
  });
}

export function useCreateExecutiveReport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      period_start: string;
      period_end: string;
      title?: string | null;
      content_text: string;
      sections: ExecutiveReport["sections"];
    }) => {
      const payload = {
        ...input,
        title: input.title ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await (supabase.from("daily_executive_reports") as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as ExecutiveReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executive_reports"] });
      toast.success("Relatório salvo no histórico");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar relatório"),
  });
}

export function useDeleteExecutiveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("daily_executive_reports") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executive_reports"] });
      toast.success("Relatório excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });
}