import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolve a lista de IDs de produtos que o usuário logado pode visualizar
 * no módulo "Saúde do Projeto".
 *
 * Regras:
 * - Admin (permissão `users` no grupo de acesso) enxerga TODOS os produtos.
 * - Demais usuários enxergam apenas produtos vinculados ao perfil em
 *   `profile_products`, com fallback para `profiles.product_id`.
 * - Enquanto carrega: `loading = true` e `productIds = []`.
 */
export function useAuthorizedProducts() {
  const { profile, permissions, loading: authLoading } = useAuth();
  const isAdmin = permissions.includes("users");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["profile_products", profile?.id ?? "anon"],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_products")
        .select("product_id")
        .eq("profile_id", profile!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.product_id as string);
    },
  });

  const productIds = useMemo(() => {
    if (isAdmin) return null; // null = sem restrição
    const set = new Set<string>(links);
    if (profile?.product_id) set.add(profile.product_id);
    return Array.from(set);
  }, [isAdmin, links, profile?.product_id]);

  /** Verifica se o usuário pode acessar um produto específico. Admin sempre pode. */
  const canAccessProduct = (productId: string | null | undefined) => {
    if (!productId) return false;
    if (isAdmin) return true;
    return (productIds ?? []).includes(productId);
  };

  return {
    isAdmin,
    /** null = admin (todos); array = lista permitida */
    productIds,
    canAccessProduct,
    loading: authLoading || (!isAdmin && !!profile?.id && isLoading),
  };
}
