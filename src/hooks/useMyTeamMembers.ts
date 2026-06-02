import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "./useTeamMembers";
import { useSquads } from "./useSquads";
import { useProfiles } from "./useProfiles";
import { useAuthorizedProducts } from "./useAuthorizedProducts";
import type { TeamMember } from "@/types/sprint";

/**
 * Retorna a mesma lista de colaboradores exibida na aba "Time" do cadastro:
 * - membros cujo coordenador é o usuário logado, OU
 * - membros pertencentes a squads que o usuário lidera/compartilha produto.
 */
export function useMyTeamMembers(): { data: TeamMember[]; isLoading: boolean } {
  const { user } = useAuth();
  const { data: members = [], isLoading: mLoading } = useTeamMembers();
  const { data: squads = [], isLoading: sLoading } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const { isAdmin, productIds } = useAuthorizedProducts();

  const myProfileId = useMemo(
    () => profiles.find((p) => p.user_id === user?.id)?.id ?? null,
    [profiles, user?.id],
  );

  const squadMemberIds = useMemo(() => {
    const ids = new Set<string>();
    const allowed = productIds ? new Set(productIds) : null;
    squads.forEach((s: any) => {
      const isLeader = !!myProfileId && s.leader_profile_id === myProfileId;
      const sharesProduct = isAdmin || !allowed || (s.product_ids ?? []).some((pid: string) => allowed.has(pid));
      if (isLeader || sharesProduct) {
        (s.member_ids ?? []).forEach((id: string) => ids.add(id));
      }
    });
    return ids;
  }, [squads, myProfileId, productIds, isAdmin]);

  const data = useMemo(
    () => members.filter((m) => m.coordinator_id === user?.id || squadMemberIds.has(m.id)),
    [members, user?.id, squadMemberIds],
  );

  return { data, isLoading: mLoading || sLoading };
}