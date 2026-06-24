import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface DevDailyEntry {
  id: string;
  user_id: string;
  squad_id: string | null;
  entry_date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  impediments: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyDevDailyEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dev_daily_entries", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DevDailyEntry[];
    },
  });
}

/** Filtra entradas por um user_id específico — usado pelo simulador de Dev. */
export function useDevDailyEntriesByUser(userId: string | null) {
  return useQuery({
    queryKey: ["dev_daily_entries", "by-user", userId ?? "none"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("*")
        .eq("user_id", userId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DevDailyEntry[];
    },
  });
}

export function useDevDailyEntriesByDate(date: string, squadId?: string | null) {
  return useQuery({
    queryKey: ["dev_daily_entries", "by-date", date, squadId ?? "all"],
    queryFn: async () => {
      let q = (supabase.from("dev_daily_entries") as any)
        .select("*")
        .eq("entry_date", date);
      if (squadId) q = q.eq("squad_id", squadId);
      const { data, error } = await q.order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DevDailyEntry[];
    },
  });
}

export function useUpsertDevDailyEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      entry_date: string;
      squad_id?: string | null;
      did_yesterday: string;
      will_do_today: string;
      impediments: string;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const payload: any = {
        user_id: user.id,
        entry_date: input.entry_date,
        squad_id: input.squad_id ?? null,
        did_yesterday: input.did_yesterday,
        will_do_today: input.will_do_today,
        impediments: input.impediments,
        updated_by: user.id,
      };
      if (input.id) {
        const { error } = await (supabase.from("dev_daily_entries") as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("dev_daily_entries") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dev_daily_entries"] });
      toast.success("Registro salvo!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
}
