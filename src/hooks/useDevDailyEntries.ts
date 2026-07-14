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
  general_notes: string | null;
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

/** Filtra entradas por lista de user_ids — usado por painéis de líder. */
export function useDevDailyEntriesByUsers(userIds: string[]) {
  return useQuery({
    queryKey: ["dev_daily_entries", "by-users", [...userIds].sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; user_id: string; entry_date: string }>;
    },
  });
}

export function useDevDailyEntriesByDate(date: string, squadId?: string | null) {
  return useQuery({
    queryKey: ["dev_daily_entries", "by-date", date, squadId ?? "all"],
    queryFn: async () => {
      if (!squadId) {
        const { data, error } = await (supabase.from("dev_daily_entries") as any)
          .select("*")
          .eq("entry_date", date)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data ?? []) as DevDailyEntry[];
      }

      // Estrito por squad: entries com squad_id preenchido só aparecem na sua squad.
      // Fallback para registros legados (squad_id IS NULL) — associa aos membros da squad.
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id")
        .eq("squad_id", squadId);
      const tmIds = (sm ?? []).map((r: any) => r.team_member_id);

      let userIds: string[] = [];
      if (tmIds.length > 0) {
        const { data: tms } = await (supabase.from("team_members") as any)
          .select("id,email,name")
          .in("id", tmIds);
        const emails = (tms ?? [])
          .map((t: any) => String(t.email ?? "").trim().toLowerCase())
          .filter(Boolean);
        const names = (tms ?? [])
          .map((t: any) => String(t.name ?? "").trim().toLowerCase())
          .filter(Boolean);
        const { data: profs } = await (supabase.from("profiles") as any)
          .select("user_id,email,first_name,last_name");
        userIds = (profs ?? [])
          .filter((p: any) => {
            const em = String(p.email ?? "").trim().toLowerCase();
            const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
            return (em && emails.includes(em)) || (full && names.includes(full));
          })
          .map((p: any) => p.user_id)
          .filter(Boolean);
      }

      // 1) Entradas explicitamente vinculadas a esta squad.
      const { data: bySquad, error: e1 } = await (supabase.from("dev_daily_entries") as any)
        .select("*")
        .eq("entry_date", date)
        .eq("squad_id", squadId)
        .order("created_at", { ascending: true });
      if (e1) throw e1;

      // 2) Fallback legado: entradas SEM squad_id, de membros conhecidos da squad.
      let legacy: DevDailyEntry[] = [];
      if (userIds.length > 0) {
        const { data, error } = await (supabase.from("dev_daily_entries") as any)
          .select("*")
          .eq("entry_date", date)
          .is("squad_id", null)
          .in("user_id", userIds)
          .order("created_at", { ascending: true });
        if (error) throw error;
        legacy = (data ?? []) as DevDailyEntry[];
      }

      // Dedup por id (por segurança).
      const map = new Map<string, DevDailyEntry>();
      [...(bySquad ?? []), ...legacy].forEach((r: DevDailyEntry) => map.set(r.id, r));
      return Array.from(map.values());
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
      general_notes?: string | null;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const payload: any = {
        user_id: user.id,
        entry_date: input.entry_date,
        squad_id: input.squad_id ?? null,
        did_yesterday: input.did_yesterday,
        will_do_today: input.will_do_today,
        impediments: input.impediments,
        general_notes: input.general_notes ?? null,
        updated_by: user.id,
      };
      if (input.id) {
        const { error } = await (supabase.from("dev_daily_entries") as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return { id: input.id };
      } else {
        const { data, error } = await (supabase.from("dev_daily_entries") as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return { id: (data as any)?.id as string };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dev_daily_entries"] });
      toast.success("Registro salvo!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
}
