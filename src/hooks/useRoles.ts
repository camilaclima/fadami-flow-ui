import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Role {
  id: string;
  title: string;
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("title");
      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("roles").insert({ title });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Cargo criado!"); },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("roles").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Cargo atualizado!"); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Cargo removido!"); },
  });
}
