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
    queryKey: ["dev_daily_entries", "mine", user?.id], staleTime: 1000 * 60,
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
    queryKey: ["dev_daily_entries", "by-user", userId ?? "none"], staleTime: 1000 * 60,
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

export function useDevDailyEntriesByDate(date: string, squadId?: string | null, memberUserIds?: string[], enabled = true) {
  return useQuery({
    queryKey: ["dev_daily_entries", "by-date", date, squadId ?? "all", memberUserIds?.join(",") ?? "auto"], staleTime: 1000 * 30,
    enabled,
    queryFn: async () => {
      if (!squadId) {
        const { data, error } = await (supabase.from("dev_daily_entries") as any)
          .select("*")
          .eq("entry_date", date)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data ?? []) as DevDailyEntry[];
      }

      // Resolve os user_ids dos membros da squad (por email OU nome), reutilizando dados já carregados quando possível.
      let userIds: string[] = memberUserIds ?? [];
      if (!memberUserIds) {
        const { data: sm } = await (supabase.from("squad_members") as any)
          .select("team_member_id")
          .eq("squad_id", squadId);
        const tmIds = (sm ?? []).map((r: any) => r.team_member_id);
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
      }

      // Busca entradas com squad_id correspondente OU user_id de algum membro da squad.
      const orParts = [`squad_id.eq.${squadId}`];
      if (userIds.length > 0) {
        orParts.push(`user_id.in.(${userIds.join(",")})`);
      }
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("*")
        .eq("entry_date", date)
        .or(orParts.join(","))
        .order("created_at", { ascending: true });
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
