import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { ManualTag } from "@/lib/executiveReportRules";

export interface DailyEntryTag {
  id: string;
  entry_id: string;
  tags: ManualTag[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDailyEntryTagsByEntries(entryIds: string[]) {
  return useQuery({
    queryKey: ["daily_entry_tags", "by-entries", [...entryIds].sort().join(",")],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_entry_tags") as any)
        .select("*")
        .in("entry_id", entryIds);
      if (error) throw error;
      return (data ?? []) as DailyEntryTag[];
    },
  });
}

export function useUpsertDailyEntryTags() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { entry_id: string; tags: ManualTag[]; notes?: string | null }) => {
      const payload = {
        entry_id: input.entry_id,
        tags: input.tags,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await (supabase.from("daily_entry_tags") as any)
        .upsert(payload, { onConflict: "entry_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as DailyEntryTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_entry_tags"] });
      toast.success("Marcações salvas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar marcações"),
  });
}