import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SimRole = "diretor" | "gp" | "dev";

export interface SimOption {
  id: string;
  label: string;
  role: SimRole;
  /** Todos os papéis do usuário (pode ter dev+gp simultaneamente). */
  roles: SimRole[];
  /** null = visão total (todas as squads). */
  squadIds: string[] | null;
  /** Apenas para role=dev — userId real usado para filtrar dev_daily_entries. */
  devUserId: string | null;
  /** Nome exibido no badge (opcional). */
  personName?: string;
}

interface Ctx {
  options: SimOption[];
  current: SimOption;
  setCurrentId: (id: string) => void;
  loading: boolean;
}

const DEFAULT: SimOption = {
  id: "diretor",
  label: "Diretor (visão completa)",
  role: "diretor",
  roles: ["diretor"],
  squadIds: null,
  devUserId: null,
};

const DailySimContext = createContext<Ctx>({
  options: [DEFAULT],
  current: DEFAULT,
  setCurrentId: () => {},
  loading: false,
});

export function DailySimProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [current, setCurrent] = useState<SimOption>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id || !user?.id) {
        if (!cancelled) {
          setCurrent(DEFAULT);
          // Mantém loading=true até o profile carregar, evitando que o
          // HomeRedirect decida pelo papel "diretor" default antes do
          // papel real do usuário ser resolvido.
          setLoading(!!user?.id && !profile?.id ? true : false);
        }
        return;
      }
      setLoading(true);
      try {
        // 1) Grupos do usuário autenticado
        const { data: pGroups } = await (supabase.from("profile_groups") as any)
          .select("group_id")
          .eq("profile_id", profile.id);
        const groupIds = (pGroups ?? []).map((g: any) => g.group_id);

        let groupNames: string[] = [];
        if (groupIds.length > 0) {
          const { data: groups } = await (supabase.from("access_groups") as any)
            .select("name")
            .in("id", groupIds);
          groupNames = (groups ?? []).map((g: any) => String(g.name ?? "").toLowerCase());
        }

        const isDev = groupNames.some((n) => n.includes("desenvolvedor"));
        const isLeader = groupNames.some((n) => n.includes("líder") || n.includes("lider"));
        const isDiretor = groupNames.some((n) => n.includes("diretor") || n.includes("admin"));

        const personName =
          `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email;

        // 2) Resolver squads relacionadas
        if (isDiretor) {
          if (!cancelled) {
            setCurrent({
              ...DEFAULT,
              personName,
              devUserId: user.id,
            });
          }
          return;
        }

        // Coleta squads de líder (se aplicável) e de dev (se aplicável).
        let leaderSquadIds: string[] = [];
        let devSquadIds: string[] = [];

        if (isLeader) {
          // Busca squads onde o usuário é líder (tabela many-to-many squad_leaders)
          // além do legado leader_profile_id em squads.
          const [{ data: leaderRows }, { data: legacySquads }] = await Promise.all([
            (supabase.from("squad_leaders") as any)
              .select("squad_id")
              .eq("profile_id", profile.id),
            (supabase.from("squads") as any)
              .select("id")
              .eq("leader_profile_id", profile.id)
              .eq("active", true),
          ]);
          const candidateIds = Array.from(new Set<string>([
            ...((leaderRows ?? []) as any[]).map((r) => r.squad_id),
            ...((legacySquads ?? []) as any[]).map((s) => s.id),
          ]));
          if (candidateIds.length > 0) {
            const { data: activeSquads } = await (supabase.from("squads") as any)
              .select("id")
              .in("id", candidateIds)
              .eq("active", true);
            leaderSquadIds = ((activeSquads ?? []) as any[]).map((s) => s.id);
          }
        }

        if (isDev) {
          // 1) Squads vinculadas ao usuário no cadastro (profile_squads)
          const { data: pSquads } = await (supabase.from("profile_squads") as any)
            .select("squad_id")
            .eq("profile_id", profile.id);
          const profileSquadIds = ((pSquads ?? []) as any[]).map((r) => r.squad_id);

          // 2) Squads vinculadas via team_members → squad_members (legado)
          const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
          const { data: tms } = await (supabase.from("team_members") as any)
            .select("id,email,name")
            .or(`email.ilike.${profile.email},name.ilike.${fullName}`);
          const tmIds = ((tms ?? []) as any[]).map((t) => t.id);
          let tmSquadIds: string[] = [];
          if (tmIds.length > 0) {
            const { data: sm } = await (supabase.from("squad_members") as any)
              .select("squad_id")
              .in("team_member_id", tmIds);
            tmSquadIds = ((sm ?? []) as any[]).map((r) => r.squad_id);
          }

          const candidateIds = Array.from(new Set<string>([...profileSquadIds, ...tmSquadIds]));
          if (candidateIds.length > 0) {
            const { data: activeSquads } = await (supabase.from("squads") as any)
              .select("id")
              .in("id", candidateIds)
              .eq("active", true);
            devSquadIds = ((activeSquads ?? []) as any[]).map((s) => s.id);
          }
        }

        if (isLeader || isDev) {
          const roles: SimRole[] = [];
          if (isLeader) roles.push("gp");
          if (isDev) roles.push("dev");
          const squadIds = Array.from(new Set<string>([...leaderSquadIds, ...devSquadIds]));
          // Papel primário: GP quando aplicável (usado só para redirect/label).
          const primary: SimRole = isLeader ? "gp" : "dev";
          if (!cancelled) {
            setCurrent({
              id: `${primary}:${profile.id}`,
              label: `${primary === "gp" ? "GP" : "Dev"} — ${personName}`,
              role: primary,
              roles,
              squadIds,
              devUserId: user.id,
              personName,
            });
          }
        } else {
          // Sem papéis específicos → fallback visão completa
          if (!cancelled) {
            setCurrent({
              ...DEFAULT,
              personName,
              devUserId: user.id,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, user?.id, profile?.email, profile?.first_name, profile?.last_name]);

  const options = useMemo(() => [current], [current]);
  const setCurrentId = (_id: string) => {
    // Simulação removida — papel é derivado do usuário autenticado.
  };

  return (
    <DailySimContext.Provider value={{ options, current, setCurrentId, loading }}>
      {children}
    </DailySimContext.Provider>
  );
}

export function useDailySim() {
  return useContext(DailySimContext);
}

/** Helper: dado um squad_id, ele é visível para o usuário simulado? */
export function isSquadAllowed(sim: SimOption, squadId: string | null | undefined): boolean {
  if (sim.role === "diretor") return true;
  if (!squadId) return false;
  return (sim.squadIds ?? []).includes(squadId);
}