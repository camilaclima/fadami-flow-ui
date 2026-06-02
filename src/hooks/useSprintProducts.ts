import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SprintProductLink {
  id: string;
  sprint_id: string;
  product_id: string;
}

export function useSprintProducts() {
  return useQuery({
    queryKey: ["sprint_products"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_products") as any).select("*");
      if (error) throw error;
      return (data ?? []) as SprintProductLink[];
    },
  });
}

export function useSetSprintProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sprintId, productIds }: { sprintId: string; productIds: string[] }) => {
      await (supabase.from("sprint_products") as any).delete().eq("sprint_id", sprintId);
      if (productIds.length) {
        const rows = productIds.map((pid) => ({ sprint_id: sprintId, product_id: pid }));
        const { error } = await (supabase.from("sprint_products") as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprint_products"] }),
  });
}