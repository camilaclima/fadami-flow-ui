import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SystemPage } from "@/types/admin";

export interface AccessGroup {
  id: string;
  name: string;
  permissions: SystemPage[];
}

export function useAccessGroups() {
  return useQuery({
    queryKey: ["access_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("access_groups").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        permissions: (g.permissions as unknown as SystemPage[]) ?? [],
      })) as AccessGroup[];
    },
  });
}

export function useAddAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, permissions }: { name: string; permissions: SystemPage[] }) => {
      const { error } = await supabase.from("access_groups").insert({ name, permissions: permissions as unknown as any });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access_groups"] }); toast.success("Grupo criado!"); },
  });
}

export function useUpdateAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, permissions }: { id: string; name: string; permissions: SystemPage[] }) => {
      const { error } = await supabase.from("access_groups").update({ name, permissions: permissions as unknown as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access_groups"] }); toast.success("Grupo atualizado!"); },
  });
}

export function useDeleteAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("access_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access_groups"] }); toast.success("Grupo removido!"); },
  });
}
