import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SimRole = "diretor" | "gp" | "dev";

export interface SimOption {
  id: string;
  label: string;
  role: SimRole;
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
        if (isLeader && !isDiretor) {
          const { data: squads } = await (supabase.from("squads") as any)
            .select("id")
            .eq("leader_profile_id", profile.id)
            .eq("active", true);
          const squadIds = (squads ?? []).map((s: any) => s.id);
          if (!cancelled) {
            setCurrent({
              id: `gp:${profile.id}`,
              label: `GP — ${personName}`,
              role: "gp",
              squadIds,
              devUserId: user.id,
              personName,
            });
          }
        } else if (isDev && !isDiretor && !isLeader) {
          // Encontra team_member pelo email OU pelo nome completo
          const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
          const { data: tms } = await (supabase.from("team_members") as any)
            .select("id,email,name")
            .or(
              `email.ilike.${profile.email},name.ilike.${fullName}`
            );
          const tmIds = (tms ?? []).map((t: any) => t.id);
          let squadIds: string[] = [];
          if (tmIds.length > 0) {
            const { data: sm } = await (supabase.from("squad_members") as any)
              .select("squad_id")
              .in("team_member_id", tmIds);
            squadIds = Array.from(new Set((sm ?? []).map((r: any) => r.squad_id)));
          }
          if (!cancelled) {
            setCurrent({
              id: `dev:${profile.id}`,
              label: `Dev — ${personName}`,
              role: "dev",
              squadIds,
              devUserId: user.id,
              personName,
            });
          }
        } else {
          // Diretor / Admin / fallback → visão completa
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