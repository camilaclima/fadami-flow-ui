import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const STORAGE_KEY = "daily-sim-user-id";

export function DailySimProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<SimOption[]>([DEFAULT]);
  const [currentId, setCurrentIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "diretor"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [squadsRes, profilesRes, smRes, tmRes] = await Promise.all([
          (supabase.from("squads") as any).select("id,name,leader_profile_id").eq("active", true).order("name"),
          (supabase.from("profiles") as any).select("id,user_id,first_name,last_name,email"),
          (supabase.from("squad_members") as any).select("squad_id,team_member_id"),
          (supabase.from("team_members") as any).select("id,name,email"),
        ]);
        const profById = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]));
        const profByEmail = new Map<string, any>(
          (profilesRes.data ?? []).map((p: any) => [String(p.email ?? "").toLowerCase(), p])
        );
        const tmById = new Map<string, any>((tmRes.data ?? []).map((t: any) => [t.id, t]));

        const opts: SimOption[] = [DEFAULT];

        (squadsRes.data ?? []).forEach((s: any) => {
          const leader = s.leader_profile_id ? profById.get(s.leader_profile_id) : null;
          const leaderName = leader
            ? `${leader.first_name ?? ""} ${leader.last_name ?? ""}`.trim() || leader.email
            : "sem responsável";
          opts.push({
            id: `gp:${s.id}`,
            label: `GP — ${s.name} (${leaderName})`,
            role: "gp",
            squadIds: [s.id],
            devUserId: leader?.user_id ?? null,
            personName: leaderName,
          });

          const memberRows = (smRes.data ?? []).filter((m: any) => m.squad_id === s.id);
          memberRows.slice(0, 4).forEach((m: any) => {
            const tm = tmById.get(m.team_member_id);
            if (!tm) return;
            const matched = profByEmail.get(String(tm.email ?? "").toLowerCase());
            opts.push({
              id: `dev:${s.id}:${tm.id}`,
              label: `Dev — ${tm.name} (${s.name})`,
              role: "dev",
              squadIds: [s.id],
              devUserId: matched?.user_id ?? null,
              personName: tm.name,
            });
          });
        });

        setOptions(opts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setCurrentId = (id: string) => {
    setCurrentIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const current = useMemo(
    () => options.find((o) => o.id === currentId) ?? options[0] ?? DEFAULT,
    [options, currentId]
  );

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