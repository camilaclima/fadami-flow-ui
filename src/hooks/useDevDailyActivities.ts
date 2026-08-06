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
  card_code: string | null;
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

/** Atividades por lista de user_ids — usado para carry-over em painéis. */
export function useDevDailyActivitiesByUsers(userIds: string[], squadId?: string | null) {
  return useQuery({
    queryKey: [
      "dev_daily_activities",
      "by-users",
      squadId ?? "any",
      [...userIds].sort().join(","),
    ],
    enabled: userIds.length > 0,
    queryFn: async () => {
      // Pagina os resultados: o limite padrão do PostgREST (1000) pode
      // truncar silenciosamente atividades quando a tabela cresce, causando
      // divergência entre Histórico e Relatório Executivo.
      const PAGE = 1000;
      const all: DevDailyActivity[] = [];
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let q = (supabase.from("dev_daily_activities") as any)
          .select("*")
          .in("user_id", userIds)
          .range(from, from + PAGE - 1);
        if (squadId) {
          // Escopo por squad: inclui as atividades da squad e as legadas
          // (sem squad atribuído) para não perder registros históricos.
          q = q.or(`squad_id.eq.${squadId},squad_id.is.null`);
        }
        const { data, error } = await q;
        if (error) throw error;
        const chunk = (data ?? []) as DevDailyActivity[];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });
}

export function useDevDailyActivityMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dev_daily_activities"] });

  /**
   * Fallback de segurança: se por algum motivo ainda existir uma atividade "gêmea"
   * (mesmo texto, mesmo registro de daily), consolidamos em uma única linha em vez
   * de exibir erro técnico para o dev.
   */
  const mergeTwinOnConflict = async (id: string, patch: Record<string, any>) => {
    const { data: current } = await (supabase.from("dev_daily_activities") as any)
      .select("id, user_id, squad_id, created_entry_id, description, card_code, dev_notes")
      .eq("id", id)
      .maybeSingle();
    if (!current?.created_entry_id) return false;
    const normalized = String(current.description ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    let q = (supabase.from("dev_daily_activities") as any)
      .select("id, description, card_code, dev_notes")
      .eq("user_id", current.user_id)
      .eq("created_entry_id", current.created_entry_id)
      .neq("id", id);
    q = current.squad_id ? q.eq("squad_id", current.squad_id) : q.is("squad_id", null);
    const { data: siblings } = await q;
    const twin = (siblings ?? []).find(
      (row: any) => String(row.description ?? "").trim().replace(/\s+/g, " ").toLowerCase() === normalized,
    );
    if (!twin?.id) return false;
    await (supabase.from("dev_daily_activities") as any)
      .update({
        ...patch,
        card_code: twin.card_code || current.card_code || "",
        dev_notes: twin.dev_notes ?? current.dev_notes ?? null,
      })
      .eq("id", twin.id);
    await (supabase.from("dev_daily_activities") as any).delete().eq("id", id);
    return true;
  };

  const create = useMutation({
    mutationFn: async (input: {
      user_id: string;
      squad_id: string | null;
      description: string;
      card_code: string;
      status?: ActivityStatus;
      created_entry_id: string;
      closed_entry_id?: string | null;
      completed_at?: string | null;
      dev_notes?: string | null;
    }) => {
      // Regra: dentro de um mesmo registro de daily cada atividade existe uma única
      // vez (independente do status). Em dias diferentes a mesma atividade pode ser
      // criada novamente. A função do banco cria ou reaproveita a atividade existente.
      const { data, error } = await (supabase.rpc as any)("upsert_dev_daily_activity", {
        _user_id: input.user_id,
        _squad_id: input.squad_id,
        _description: input.description,
        _card_code: input.card_code,
        _status: input.status ?? "pendente",
        _created_entry_id: input.created_entry_id,
        _closed_entry_id: input.closed_entry_id ?? null,
        _completed_at: input.completed_at ?? null,
        _dev_notes: input.dev_notes ?? null,
        _updated_by: user?.id ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { id: (row as any)?.id as string };
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar atividade"),
  });

  const markCompleted = useMutation({
    mutationFn: async (input: { id: string; closed_entry_id: string }) => {
      const patch = {
        status: "concluida",
        completed_at: new Date().toISOString(),
        inactivated_at: null,
        closed_entry_id: input.closed_entry_id,
        updated_by: user?.id ?? null,
      };
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update(patch)
        .eq("id", input.id);
      if (error) {
        if ((error as any)?.code === "23505" && (await mergeTwinOnConflict(input.id, patch))) return;
        throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao concluir atividade"),
  });

  const markInactive = useMutation({
    mutationFn: async (input: { id: string; closed_entry_id: string }) => {
      const patch = {
        status: "inativa",
        inactivated_at: new Date().toISOString(),
        completed_at: null,
        closed_entry_id: input.closed_entry_id,
        updated_by: user?.id ?? null,
      };
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update(patch)
        .eq("id", input.id);
      if (error) {
        if ((error as any)?.code === "23505" && (await mergeTwinOnConflict(input.id, patch))) return;
        throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao inativar atividade"),
  });

  const revertPending = useMutation({
    mutationFn: async (id: string) => {
      const patch = {
        status: "pendente",
        completed_at: null,
        inactivated_at: null,
        closed_entry_id: null,
        updated_by: user?.id ?? null,
      };
      const { error } = await (supabase.from("dev_daily_activities") as any)
        .update(patch)
        .eq("id", id);
      if (error) {
        if ((error as any)?.code === "23505" && (await mergeTwinOnConflict(id, patch))) return;
        throw error;
      }
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