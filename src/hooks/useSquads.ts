import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Squad {
  id: string;
  name: string;
  leader_profile_id: string | null;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  member_ids: string[];
  product_ids: string[];
}

export interface SquadInput {
  name: string;
  leader_profile_id: string | null;
  description?: string;
  active?: boolean;
  member_ids: string[];
  product_ids: string[];
}

async function fetchSquads(): Promise<Squad[]> {
  const { data: squads, error } = await (supabase.from("squads") as any)
    .select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (squads as any[]).map((s) => s.id);
  if (ids.length === 0) return [];
  const [{ data: members }, { data: prods }] = await Promise.all([
    (supabase.from("squad_members") as any).select("*").in("squad_id", ids),
    (supabase.from("squad_products") as any).select("*").in("squad_id", ids),
  ]);
  return (squads as any[]).map((s) => ({
    ...s,
    member_ids: ((members ?? []) as any[]).filter((m) => m.squad_id === s.id).map((m) => m.team_member_id),
    product_ids: ((prods ?? []) as any[]).filter((p) => p.squad_id === s.id).map((p) => p.product_id),
  })) as Squad[];
}

export function useSquads() {
  return useQuery({ queryKey: ["squads"], staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30, queryFn: fetchSquads });
}

export function useActiveSquads() {
  return useQuery({
    queryKey: ["squads", "active"], staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30,
    queryFn: async () => (await fetchSquads()).filter((s) => s.active),
  });
}

export function useSaveSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SquadInput & { id?: string }) => {
      let squadId = input.id;
      if (squadId) {
        const { error } = await (supabase.from("squads") as any).update({
          name: input.name,
          leader_profile_id: input.leader_profile_id,
          description: input.description ?? "",
          active: input.active ?? true,
        }).eq("id", squadId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("squads") as any).insert({
          name: input.name,
          leader_profile_id: input.leader_profile_id,
          description: input.description ?? "",
          active: input.active ?? true,
        }).select("id").single();
        if (error) throw error;
        squadId = data.id;
      }
      // reset members & products (simpler than diff)
      await (supabase.from("squad_members") as any).delete().eq("squad_id", squadId);
      await (supabase.from("squad_products") as any).delete().eq("squad_id", squadId);
      if (input.member_ids.length) {
        const { error } = await (supabase.from("squad_members") as any).insert(
          input.member_ids.map((tm) => ({ squad_id: squadId, team_member_id: tm })),
        );
        if (error) throw error;
      }
      if (input.product_ids.length) {
        const { error } = await (supabase.from("squad_products") as any).insert(
          input.product_ids.map((pid) => ({ squad_id: squadId, product_id: pid })),
        );
        if (error) throw error;
      }
      return squadId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["squads"] });
      toast.success("Squad salva!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar squad"),
  });
}

export function useDeleteSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("squads") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["squads"] });
      toast.success("Squad excluída");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });
}
