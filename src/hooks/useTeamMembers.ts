import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TeamMember } from "@/types/sprint";

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("team_members") as any)
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

export function useAllTeamMembers() {
  return useQuery({
    queryKey: ["team_members_all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("team_members") as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: Omit<TeamMember, "id" | "created_at" | "active">) => {
      const { data, error } = await (supabase.from("team_members") as any)
        .insert(member).select("*").single();
      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["team_members_all"] });
      toast.success("Colaborador adicionado!");
    },
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<TeamMember>) => {
      const { error } = await (supabase.from("team_members") as any).update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["team_members_all"] });
      toast.success("Colaborador atualizado!");
    },
  });
}

export function useToggleTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase.from("team_members") as any).update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members"] });
      qc.invalidateQueries({ queryKey: ["team_members_all"] });
      toast.success("Status atualizado!");
    },
  });
}
