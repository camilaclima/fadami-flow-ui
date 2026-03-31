import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileProduct {
  id: string;
  profile_id: string;
  product_id: string;
}

export interface ProfileGroup {
  id: string;
  profile_id: string;
  group_id: string;
}

export function useProfileProducts() {
  return useQuery({
    queryKey: ["profile_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_products").select("*");
      if (error) throw error;
      return data as ProfileProduct[];
    },
  });
}

export function useProfileGroups() {
  return useQuery({
    queryKey: ["profile_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_groups").select("*");
      if (error) throw error;
      return data as ProfileGroup[];
    },
  });
}

export function useSyncProfileProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, productIds }: { profileId: string; productIds: string[] }) => {
      await supabase.from("profile_products").delete().eq("profile_id", profileId);
      if (productIds.length > 0) {
        const rows = productIds.map((pid) => ({ profile_id: profileId, product_id: pid }));
        const { error } = await supabase.from("profile_products").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile_products"] }); },
  });
}

export function useSyncProfileGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, groupIds }: { profileId: string; groupIds: string[] }) => {
      await supabase.from("profile_groups").delete().eq("profile_id", profileId);
      if (groupIds.length > 0) {
        const rows = groupIds.map((gid) => ({ profile_id: profileId, group_id: gid }));
        const { error } = await supabase.from("profile_groups").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile_groups"] }); },
  });
}
