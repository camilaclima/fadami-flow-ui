import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck, AlertOctagon, Sparkles, TrendingUp, AlertTriangle, Flame,
  CheckCircle2, History, Users, Loader2, Mic, MicOff, Video, VideoOff, Paperclip, MessageSquare, StickyNote,
  UserCheck, UserMinus, CalendarX,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { useDailySim } from "@/contexts/DailySimContext";
import { useProfiles } from "@/hooks/useProfiles";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { useSquads } from "@/hooks/useSquads";
import { useDevDailyActivitiesByEntries, useDevDailyActivitiesByUsers, type DevDailyActivity } from "@/hooks/useDevDailyActivities";
import { Circle, XCircle } from "lucide-react";
import { DailyReadOnlyView } from "@/components/dailys/DailyReadOnlyView";
import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/formatDuration";
import { FreeTextActivityList } from "@/lib/dailyFreeText";

interface MeetingRow {
  id: string;
  squad_id: string | null;
  meeting_date: string;
  conducted_by: string | null;
  observations: string | null;
  transcript_url: string | null;
  duration_seconds?: number | null;
}
interface AttendanceRow {
  id: string;
  meeting_id: string;
  member_user_id: string | null;
  member_name: string | null;
  camera_on: boolean;
  stayed_silent: boolean;
  dev_entry_id: string | null;
  notes: string | null;
  absent_from_work: boolean | null;
  did_not_participate: boolean | null;
  non_participation_reason: string | null;
}

interface AIRecorrencia { descricao: string; dias_consecutivos: number; responsavel?: string; }
interface AIInsights {
  avancos?: string[];
  riscos?: string[];
  recorrencias?: AIRecorrencia[];
  status_geral?: "saudavel" | "atencao" | "critico";
  resumo_executivo?: string;
  resumo_curto?: string;
  proximos_passos?: string[];
}

interface DevEntryRow {
  id: string;
  user_id: string;
  squad_id: string | null;
  entry_date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  impediments: string | null;
  fill_duration_seconds?: number | null;
  created_at: string;
}

interface DayGroup {
  date: string;
  entries: DevEntryRow[];
}

export default function HistoricoPage({ filterSquadId }: { filterSquadId?: string | null } = {}) {
  const { current: sim } = useDailySim();
  const { data: profiles = [] } = useProfiles();
  const { data: squads = [] } = useSquads();
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);

  // Resolve os user_ids visíveis: GP vê apenas membros das suas squads;
  // Diretor vê todos os user_ids que registraram dailys.
  // Se um filterSquadId for informado (ex.: filtro do topo do Painel), restringe a essa squad.
  const squadIds = filterSquadId
    ? [filterSquadId]
    : sim.role === "gp"
      ? (sim.squadIds ?? [])
      : null;
  const scopedSquadId = filterSquadId ?? null;

  const { data: allowedUserIds = null } = useQuery<string[] | null>({
    queryKey: ["historico_allowed_users", sim.role, scopedSquadId ?? "any", (squadIds ?? []).slice().sort().join(",")],
    enabled: sim.role === "diretor" || (squadIds !== null && squadIds.length > 0) || !!scopedSquadId,
    queryFn: async () => {
      if (sim.role === "diretor" && !scopedSquadId) return null; // null = sem filtro
      if (!squadIds || squadIds.length === 0) return [];
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id")
        .in("squad_id", squadIds);
      const tmIds = (sm ?? []).map((r: any) => r.team_member_id);
      const { data: tms } = tmIds.length > 0
        ? await (supabase.from("team_members") as any)
            .select("id,email,name").in("id", tmIds)
        : { data: [] as any[] };
      const emails = (tms ?? []).map((t: any) => String(t.email ?? "").trim().toLowerCase()).filter(Boolean);
      const names = (tms ?? []).map((t: any) => String(t.name ?? "").trim().toLowerCase()).filter(Boolean);
      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id,email,first_name,last_name");
      const ids = (profs ?? [])
        .filter((p: any) => {
          const em = String(p.email ?? "").trim().toLowerCase();
          const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
          return (em && emails.includes(em)) || (full && names.includes(full));
        })
        .map((p: any) => p.user_id)
        .filter(Boolean);
      // União com quem efetivamente registrou dailies para as squads em escopo,
      // garantindo que o Histórico não esconda devs que registram mas não estão
      // formalmente listados em squad_members (fonte única de verdade).
      const { data: entryAuthors } = await (supabase.from("dev_daily_entries") as any)
        .select("user_id")
        .in("squad_id", squadIds);
      const authorIds = (entryAuthors ?? []).map((r: any) => r.user_id).filter(Boolean);
      return Array.from(new Set<string>([...(ids as string[]), ...authorIds]));
    },
  });

  const { data: entries = [], isLoading } = useQuery<DevEntryRow[]>({
    queryKey: ["historico_dev_entries", sim.role, scopedSquadId ?? "any", (allowedUserIds ?? ["__all__"]).slice().sort().join(",")],
    enabled: (sim.role === "diretor" && !scopedSquadId) || (Array.isArray(allowedUserIds) && allowedUserIds.length > 0),
    queryFn: async () => {
      let q = (supabase.from("dev_daily_entries") as any)
        .select("*")
        .order("entry_date", { ascending: false });
      if (allowedUserIds && allowedUserIds.length > 0) {
        q = q.in("user_id", allowedUserIds);
      }
      if (scopedSquadId) {
        // Entries desta squad OU legadas (squad_id NULL) para os membros permitidos.
        q = q.or(`squad_id.eq.${scopedSquadId},squad_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DevEntryRow[];
    },
  });

  const profileByUser = useMemo(() => {
    const m = new Map<string, any>();
    profiles.forEach((p: any) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const squadNameById = useMemo(() => {
    const m = new Map<string, string>();
    (squads as any[]).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [squads]);

  const nameFor = (uid: string): string => {
    const p = profileByUser.get(uid);
    if (!p) return "Colaborador";
    return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Colaborador";
  };

  // Agrupa por entry_date (desc).
  const days: DayGroup[] = useMemo(() => {
    const grouped = new Map<string, DevEntryRow[]>();
    entries.forEach((e) => {
      const list = grouped.get(e.entry_date) ?? [];
      list.push(e);
      grouped.set(e.entry_date, list);
    });
    return Array.from(grouped.entries())
      .map(([date, list]) => ({ date, entries: list }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Impedimentos para entries do dia selecionado (lazy).
  const selectedEntryIds = useMemo(
    () => (selectedDay?.entries ?? []).map((e) => e.id),
    [selectedDay],
  );
  const { data: dayImpediments = [] } = useDevDailyImpedimentsByEntries(selectedEntryIds);

  // Impedimentos globais (para contagem no card de cada dia).
  const allEntryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { data: allImps = [] } = useDevDailyImpedimentsByEntries(allEntryIds);
  // Contagem por dia: impedimentos "vivos" no fim daquele dia (criados <= D
  // e ainda não sanados até o fim de D). Escopo de squad já vem aplicado
  // pelas entries carregadas.
  const impCountByDate = useMemo(() => {
    const m = new Map<string, number>();
    const uniqueDates = Array.from(new Set(entries.map((e) => e.entry_date)));
    uniqueDates.forEach((D) => {
      const count = allImps.reduce((acc, i) => {
        const createdDate = (i.created_at ?? "").slice(0, 10);
        if (!createdDate || createdDate > D) return acc;
        if (i.resolved) {
          if (!i.resolved_at) return acc;
          if (i.resolved_at.slice(0, 10) <= D) return acc;
        }
        return acc + 1;
      }, 0);
      m.set(D, count);
    });
    return m;
  }, [allImps, entries]);

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6" /> Histórico de Dailies</h1>
        <p className="text-sm text-muted-foreground">Registros consolidados por dia, com o que cada desenvolvedor preencheu.</p>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {isLoading ? "Carregando..." : `Mostrando ${days.length} dia(s) de registros.`}
      </p>

      <div className="space-y-2">
        {!isLoading && days.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma daily registrada.</CardContent></Card>
        )}
        {days.map((day) => {
          const totalImps = impCountByDate.get(day.date) ?? 0;
          const names = day.entries.map((e) => nameFor(e.user_id)).slice(0, 3).join(", ");
          const extras = day.entries.length - 3;
          return (
            <motion.div key={day.date} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                onClick={() => setSelectedDay(day)}
                className="cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
              >
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge className="flex-shrink-0 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 gap-1">
                      <CalendarCheck className="h-3 w-3" />
                      {format(parseISO(day.date), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                    <Badge variant="outline" className="flex-shrink-0 text-xs capitalize">
                      {format(parseISO(day.date), "EEEE", { locale: ptBR })}
                    </Badge>
                    <Badge variant="secondary" className="flex-shrink-0 text-xs gap-1">
                      <Users className="h-3 w-3" /> {day.entries.length} {day.entries.length === 1 ? "dev" : "devs"}
                    </Badge>
                    <p className="text-sm text-muted-foreground truncate">
                      {names}{extras > 0 ? ` +${extras}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totalImps > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 border-orange-500/50 text-orange-600">
                        <AlertOctagon className="h-3 w-3" />
                        {totalImps} {totalImps === 1 ? "impedimento" : "impedimentos"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <DayDetailDialog
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        nameFor={nameFor}
        impediments={dayImpediments}
        scopedSquadIds={scopedSquadId ? [scopedSquadId] : (sim.role === "diretor" ? null : (sim.squadIds ?? []))}
        squadNameById={squadNameById}
        filterSquadId={scopedSquadId}
      />
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function buildSummaryForAI(
  day: DayGroup,
  nameFor: (uid: string) => string,
  impsByEntry: Map<string, { description: string; urgency: string; resolved: boolean }[]>,
  meetings: MeetingRow[],
  attByEntry: Map<string, AttendanceRow[]>,
  attByUser: Map<string, AttendanceRow[]>,
  squadNameById: Map<string, string>,
): { summary: string; members: string[] } {
  const parts: string[] = [];
  const members: string[] = [];
  day.entries.forEach((e) => {
    const name = nameFor(e.user_id);
    members.push(name);
    const imps = (impsByEntry.get(e.id) ?? []).map((i) =>
      `- ${i.description} (urgência ${i.urgency}${i.resolved ? ", resolvido" : ""})`,
    );
    const atts = (attByEntry.get(e.id) ?? []).concat(
      (attByUser.get(e.user_id) ?? []).filter((a) => !a.dev_entry_id),
    );
    const obsLider = atts
      .map((a) =>
        `- câmera ${a.camera_on ? "ligada" : "desligada"}, ${a.stayed_silent ? "ficou em silêncio" : "participou da fala"}${a.notes ? `, obs: ${a.notes}` : ""}`,
      ).join("\n");
    parts.push(
      `=== ${name} ===\n` +
        `Ontem: ${e.did_yesterday?.trim() || "—"}\n` +
        `Hoje: ${e.will_do_today?.trim() || "—"}\n` +
        `Impedimentos: ${imps.length ? "\n" + imps.join("\n") : "—"}\n` +
        `Observações do líder: ${obsLider ? "\n" + obsLider : "—"}`,
    );
  });
  if (meetings.length > 0) {
    const mt = meetings.map((m) => {
      const sq = m.squad_id ? squadNameById.get(m.squad_id) ?? "Squad" : "Sem squad";
      return `- [${sq}] ${m.observations?.trim() || "(sem observações gerais)"}${m.transcript_url ? ` | anexo: ${m.transcript_url}` : ""}`;
    }).join("\n");
    parts.push(`=== Observações gerais do líder ===\n${mt}`);
  }
  return { summary: parts.join("\n\n"), members };
}

function DayDetailDialog({
  day,
  onClose,
  nameFor,
  impediments,
  scopedSquadIds,
  squadNameById,
  filterSquadId,
}: {
  day: DayGroup | null;
  onClose: () => void;
  nameFor: (uid: string) => string;
  impediments: { id: string; entry_id: string; description: string; urgency: string; resolved: boolean }[];
  scopedSquadIds: string[] | null;
  squadNameById: Map<string, string>;
  filterSquadId?: string | null;
}) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Universo maior: para cada usuário do dia, precisamos ver impedimentos criados
  // em qualquer entry anterior/dele até D e que ainda estejam em aberto (ou sanados em D).
  const dayUserIds = useMemo(
    () => Array.from(new Set((day?.entries ?? []).map((e) => e.user_id))),
    [day],
  );
  const { data: userEntriesUpto = [] } = useQuery({
    queryKey: ["historico_user_entries_upto", day?.date ?? "", dayUserIds.slice().sort().join(","), filterSquadId ?? "any"],
    enabled: !!day && dayUserIds.length > 0,
    queryFn: async () => {
      let q = (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date,squad_id")
        .in("user_id", dayUserIds)
        .lte("entry_date", day!.date);
      if (filterSquadId) {
        q = q.or(`squad_id.eq.${filterSquadId},squad_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; user_id: string; entry_date: string; squad_id: string | null }[];
    },
  });
  const uptoEntryIds = useMemo(() => userEntriesUpto.map((e) => e.id), [userEntriesUpto]);
  const { data: uptoImpediments = [] } = useDevDailyImpedimentsByEntries(uptoEntryIds);

  // Mapa: entry.id do dia -> impedimentos visíveis (do próprio dev, criados até D,
  // e ainda em aberto OU sanados no próprio dia D).
  const impsByEntry = useMemo(() => {
    const D = day?.date ?? "";
    const entryById = new Map(userEntriesUpto.map((e) => [e.id, e]));
    const byUser = new Map<string, typeof impediments>();
    uptoImpediments.forEach((imp) => {
      const origin = entryById.get(imp.entry_id);
      if (!origin) return;
      if (origin.entry_date > D) return;
      if (imp.resolved) {
        const rd = imp.resolved_at ? imp.resolved_at.slice(0, 10) : null;
        if (rd && rd < D) return;
      }
      const list = byUser.get(origin.user_id) ?? [];
      list.push(imp as any);
      byUser.set(origin.user_id, list);
    });
    const m = new Map<string, typeof impediments>();
    (day?.entries ?? []).forEach((e) => {
      m.set(e.id, (byUser.get(e.user_id) ?? []) as any);
    });
    return m;
  }, [uptoImpediments, userEntriesUpto, day]);

  // Busca por usuário — assim vemos carry-overs pendentes cuja origem é um entry
  // de dia anterior (não pertence a dayEntryIds).
  const { data: dayActivitiesRaw = [] } = useDevDailyActivitiesByUsers(
    dayUserIds,
    filterSquadId ?? null,
  );
  const dayActivities = useMemo(() => {
    if (!filterSquadId) return dayActivitiesRaw;
    return dayActivitiesRaw.filter((a: any) => a.squad_id === filterSquadId || a.squad_id == null);
  }, [dayActivitiesRaw, filterSquadId]);

  const activitiesByEntry = useMemo(() => {
    const done = new Map<string, DevDailyActivity[]>();
    const inactive = new Map<string, DevDailyActivity[]>();
    const planned = new Map<string, DevDailyActivity[]>();
    const entryById = new Map(userEntriesUpto.map((e) => [e.id, e]));

    dayActivities.forEach((a) => {
      if (a.closed_entry_id && (a.status === "concluida" || a.status === "inativa")) {
        const map = a.status === "concluida" ? done : inactive;
        const list = map.get(a.closed_entry_id) ?? [];
        list.push(a);
        map.set(a.closed_entry_id, list);
      }
    });

    // "Hoje" (planned) de cada entry inclui todas as atividades pendentes do dev
    // cuja data de origem seja <= o entry_date e que não estejam fechadas até lá.
    (day?.entries ?? []).forEach((e) => {
      const D = e.entry_date;
      const arr = dayActivities.filter((a) => {
        if (a.user_id !== e.user_id) return false;
        if (a.status !== "pendente") return false;
        const origin = a.created_entry_id ? entryById.get(a.created_entry_id) : null;
        if (!origin) return false;
        const originDate = origin.entry_date;
        if (originDate > D) return false;
        if (a.closed_entry_id) {
          const closed = entryById.get(a.closed_entry_id);
          if (closed && closed.entry_date <= D) return false;
        }
        return true;
      });
      if (arr.length > 0) planned.set(e.id, arr);
    });

    return { done, inactive, planned };
  }, [dayActivities, day, userEntriesUpto]);

  // Busca daily meetings (observações do líder) do dia selecionado.
  const { data: meetings = [] } = useQuery<MeetingRow[]>({
    queryKey: ["historico_meetings", day?.date ?? "", (scopedSquadIds ?? []).slice().sort().join(",")],
    enabled: !!day,
    queryFn: async () => {
      let q = (supabase.from("daily_meetings") as any)
        .select("*").eq("meeting_date", day!.date);
      if (scopedSquadIds && scopedSquadIds.length > 0) q = q.in("squad_id", scopedSquadIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MeetingRow[];
    },
  });

  const meetingIds = useMemo(() => meetings.map((m) => m.id), [meetings]);
  const { data: attendance = [] } = useQuery<AttendanceRow[]>({
    queryKey: ["historico_attendance", meetingIds.slice().sort().join(",")],
    enabled: meetingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meeting_attendance") as any)
        .select("*").in("meeting_id", meetingIds);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const attByEntry = useMemo(() => {
    const m = new Map<string, AttendanceRow[]>();
    attendance.forEach((a) => {
      if (!a.dev_entry_id) return;
      const list = m.get(a.dev_entry_id) ?? [];
      list.push(a);
      m.set(a.dev_entry_id, list);
    });
    return m;
  }, [attendance]);

  const attByUser = useMemo(() => {
    const m = new Map<string, AttendanceRow[]>();
    attendance.forEach((a) => {
      if (!a.member_user_id) return;
      const list = m.get(a.member_user_id) ?? [];
      list.push(a);
      m.set(a.member_user_id, list);
    });
    return m;
  }, [attendance]);

  // Membros de todas as squads em escopo (para completar cards vazios em cinza).
  const { data: squadMemberUserIds = [] } = useQuery<string[]>({
    queryKey: ["historico_squad_members", (scopedSquadIds ?? []).slice().sort().join(",")],
    enabled: !!day && Array.isArray(scopedSquadIds) && scopedSquadIds.length > 0,
    queryFn: async () => {
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id")
        .in("squad_id", scopedSquadIds!);
      const tmIds = (sm ?? []).map((r: any) => r.team_member_id);
      if (tmIds.length === 0) return [];
      const { data: tms } = await (supabase.from("team_members") as any)
        .select("id,email,name").in("id", tmIds);
      const emails = (tms ?? []).map((t: any) => String(t.email ?? "").trim().toLowerCase()).filter(Boolean);
      const names = (tms ?? []).map((t: any) => String(t.name ?? "").trim().toLowerCase()).filter(Boolean);
      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id,email,first_name,last_name");
      const ids = (profs ?? [])
        .filter((p: any) => {
          const em = String(p.email ?? "").trim().toLowerCase();
          const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
          return (em && emails.includes(em)) || (full && names.includes(full));
        })
        .map((p: any) => p.user_id)
        .filter(Boolean);
      return Array.from(new Set(ids)) as string[];
    },
  });

  // Entradas sintéticas: membros da squad sem registro próprio + devs marcados
  // pelo líder (ausentes, não participou, etc.). Sem elas, o histórico oculta
  // quem não preencheu ou ausências decididas pelo líder.
  const augmentedEntries = useMemo(() => {
    if (!day) return [] as DevEntryRow[];
    const existingUserIds = new Set(day.entries.map((e) => e.user_id));
    const seen = new Set<string>();
    const extras: DevEntryRow[] = [];
    const pushVirtual = (uid: string) => {
      if (!uid) return;
      if (existingUserIds.has(uid) || seen.has(uid)) return;
      seen.add(uid);
      extras.push({
        id: `virtual:${uid}`,
        user_id: uid,
        squad_id: null,
        entry_date: day.date,
        did_yesterday: null,
        will_do_today: null,
        impediments: null,
        fill_duration_seconds: null,
        created_at: "",
      });
    };
    // 1) todos os membros da squad em escopo.
    squadMemberUserIds.forEach(pushVirtual);
    // 2) marcados pelo líder (fallback quando não temos escopo de squad).
    attendance.forEach((a) => { if (a.member_user_id) pushVirtual(a.member_user_id); });
    return [...day.entries, ...extras];
  }, [day, attendance, squadMemberUserIds]);

  // Resumo de tempos: reunião do líder, soma dos devs, total e média.
  const timeSummary = useMemo(() => {
    const meetingSec = meetings.reduce((acc, m) => acc + (m.duration_seconds ?? 0), 0);
    let devsSec = 0;
    let devsCount = 0;
    (day?.entries ?? []).forEach((e) => {
      if (e.fill_duration_seconds != null) {
        devsSec += e.fill_duration_seconds;
        devsCount++;
      }
    });
    const total = meetingSec + devsSec;
    const avg = devsCount > 0 ? Math.round(devsSec / devsCount) : null;
    return { meetingSec, devsSec, total, avg, devsCount };
  }, [meetings, day]);

  // Reset insights ao trocar de dia.
  useEffect(() => {
    setInsights(null);
    setAiError(null);
  }, [day?.date]);

  const runAnalysis = async () => {
    if (!day) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const { summary, members } = buildSummaryForAI(
        day, nameFor, impsByEntry as any, meetings, attByEntry, attByUser, squadNameById,
      );
      const { data, error } = await supabase.functions.invoke("analyze-daily-status", {
        body: {
          todaySummary: summary,
          presentMembers: members,
          history: [],
        },
      });
      if (error) throw error;
      setInsights((data?.insights ?? null) as AIInsights | null);
    } catch (e: any) {
      setAiError(e?.message ?? "Falha ao gerar análise");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Daily de {format(parseISO(day.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" /> {augmentedEntries.length} {augmentedEntries.length === 1 ? "desenvolvedor" : "desenvolvedores"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {format(parseISO(day.date), "EEEE", { locale: ptBR })}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            {(timeSummary.meetingSec > 0 || timeSummary.devsSec > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border bg-muted/20 p-2">
                <TimeStat label="TEMPO TOTAL DA DAILY" value={formatDuration(timeSummary.meetingSec) ?? "—"} />
                <TimeStat label="TEMPO TOTAL DOS DEVS" value={formatDuration(timeSummary.devsSec) ?? "—"} />
                <TimeStat label="TEMPO TOTAL DO TIME" value={formatDuration(timeSummary.total) ?? "—"} highlight />
                <TimeStat
                  label={`Média por dev${timeSummary.devsCount ? ` (${timeSummary.devsCount})` : ""}`}
                  value={timeSummary.avg != null ? (formatDuration(timeSummary.avg) ?? "—") : "—"}
                />
              </div>
            )}

            <Tabs defaultValue="bruto" className="flex-1 flex flex-col min-h-0">
              <TabsList className="self-start">
                <TabsTrigger value="bruto">Relatório Bruto</TabsTrigger>
                <TabsTrigger value="ia">Análise da IA</TabsTrigger>
              </TabsList>
              <TabsContent value="bruto" className="flex-1 min-h-0">
                <ScrollArea className="h-[60vh] pr-3">
                  <DailyReadOnlyView
                    date={day.date}
                    entries={augmentedEntries as any}
                    meetings={meetings as any}
                    attByEntry={attByEntry as any}
                    attByUser={attByUser as any}
                    impsByEntry={impsByEntry as any}
                    activitiesByEntry={activitiesByEntry}
                    nameFor={nameFor}
                    squadNameById={squadNameById}
                  />
                  {false && (
                  <div className="space-y-2.5">
                    {meetings.length > 0 && (
                      <div className="space-y-2">
                        {meetings.map((mt) => {
                          const sq = mt.squad_id ? squadNameById.get(mt.squad_id) ?? "Squad" : "Sem squad";
                          return (
                            <Card key={mt.id} className="border-l-4 border-l-amber-500/70 bg-amber-500/5">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-amber-600" />
                                  Observações do líder — {sq}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <Section label="Observações gerais" text={mt.observations} />
                                {mt.transcript_url && (
                                  <div className="text-sm flex items-center gap-2">
                                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                    <a
                                      href={mt.transcript_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline break-all"
                                    >
                                      Anexo / transcrição
                                    </a>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                    {day.entries.map((e) => {
                      const name = nameFor(e.user_id);
                      const imps = impsByEntry.get(e.id) ?? [];
                      const atts = (attByEntry.get(e.id) ?? []).concat(
                        (attByUser.get(e.user_id) ?? []).filter((a) => !a.dev_entry_id),
                      );
                      const att = atts[0] ?? null;
                      const isAbsent = !!att?.absent_from_work;
                      const isNoPart = !!att?.did_not_participate;
                      const isPresent = !isAbsent && !isNoPart;
                      return (
                        <Card
                          key={e.id}
                          className={cn(
                            "border-l-4 bg-card/40",
                            isAbsent
                              ? "border-l-red-500/70 bg-red-500/[0.03]"
                              : isNoPart
                              ? "border-l-amber-500/70 bg-amber-500/[0.03]"
                              : "border-l-primary/60",
                          )}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                                  isAbsent
                                    ? "bg-red-500/10 text-red-600"
                                    : isNoPart
                                    ? "bg-amber-500/10 text-amber-700"
                                    : "bg-primary/15 text-primary",
                                )}
                              >
                                {initials(name)}
                              </div>
                              <CardTitle className="text-sm">{name}</CardTitle>
                              {isAbsent && (
                                <Badge variant="outline" className="gap-1 text-[10px] border-red-500/40 text-red-600 bg-red-500/5">
                                  <CalendarX className="h-3 w-3" /> Ausente do trabalho
                                </Badge>
                              )}
                              {isNoPart && (
                                <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-700 bg-amber-500/5">
                                  <UserMinus className="h-3 w-3" /> Não participou
                                </Badge>
                              )}
                              {isPresent && att && (
                                <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                                  <UserCheck className="h-3 w-3" /> Presente
                                </Badge>
                              )}
                              {isPresent && atts.map((a) => (
                                <div key={a.id} className="flex items-center gap-1.5 ml-1">
                                  <Badge variant="outline" className={cn("gap-1 text-[10px]", a.camera_on ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-muted-foreground/30 text-muted-foreground")}>
                                    {a.camera_on ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                                    {a.camera_on ? "Câmera" : "Sem câmera"}
                                  </Badge>
                                  <Badge variant="outline" className={cn("gap-1 text-[10px]", a.stayed_silent ? "border-amber-500/40 text-amber-700 dark:text-amber-400" : "border-emerald-500/40 text-emerald-700 dark:text-emerald-400")}>
                                    {a.stayed_silent ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                                    {a.stayed_silent ? "Silêncio" : "Falou"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2.5">
                            {isNoPart && att?.non_participation_reason?.trim() && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                                  Motivo da não participação
                                </p>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-amber-500/40 pl-2">
                                  {att.non_participation_reason}
                                </p>
                              </div>
                            )}
                            <ActivitiesSection
                              label="O que fiz"
                              done={activitiesByEntry.done.get(e.id) ?? []}
                              inactive={activitiesByEntry.inactive.get(e.id) ?? []}
                              fallback={e.did_yesterday}
                            />
                            <PlannedSection
                              label="O que farei"
                              planned={activitiesByEntry.planned.get(e.id) ?? []}
                              fallback={e.will_do_today}
                            />
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Impedimentos</p>
                              {imps.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Nenhum impedimento registrado.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {imps.map((i) => (
                                    <div key={i.id} className="flex items-start gap-2 text-sm">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] flex-shrink-0 mt-0.5",
                                          URGENCY_STYLES[i.urgency as keyof typeof URGENCY_STYLES],
                                        )}
                                      >
                                        {URGENCY_LABELS[i.urgency as keyof typeof URGENCY_LABELS]}
                                      </Badge>
                                      <span className={i.resolved ? "text-muted-foreground line-through" : ""}>
                                        {i.description}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {atts.some((a) => a.notes?.trim()) && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                                  <StickyNote className="h-3 w-3" /> Observação do líder
                                </p>
                                <div className="space-y-1">
                                  {atts.filter((a) => a.notes?.trim()).map((a) => (
                                    <p key={a.id} className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 border-l-2 border-amber-500/40 pl-2">
                                      {a.notes}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="ia" className="flex-1 min-h-0">
                <ScrollArea className="h-[60vh] pr-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        Análise consolidada de tudo que foi escrito por todos os desenvolvedores neste dia.
                      </p>
                      <Button size="sm" variant="outline" onClick={runAnalysis} disabled={loadingAI}>
                        {loadingAI ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
                        ) : (
                          <><Sparkles className="h-4 w-4 mr-2" /> {insights ? "Reanalisar" : "Analisar com IA"}</>
                        )}
                      </Button>
                    </div>
                    {aiError && (
                      <p className="text-sm text-destructive">{aiError}</p>
                    )}
                    {!insights && !loadingAI && !aiError && (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        Clique em "Analisar com IA" para gerar avanços, riscos e recorrências deste dia.
                      </p>
                    )}
                    {insights && <DailyAIDetail insights={insights} />}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
        {text?.trim() ? text : "—"}
      </p>
    </div>
  );
}

function TimeStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md px-2.5 py-1.5", highlight ? "bg-primary/10" : "bg-background")}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold flex items-center gap-1", highlight ? "text-primary" : "text-foreground")}>
        <Clock className="h-3 w-3" /> {value}
      </p>
    </div>
  );
}

function ActivitiesSection({
  label,
  done,
  inactive,
  fallback,
}: {
  label: string;
  done: DevDailyActivity[];
  inactive: DevDailyActivity[];
  fallback: string | null;
}) {
  const hasAny = done.length + inactive.length > 0;
  if (!hasAny) {
    if (fallback?.trim()) {
      return (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
          <FreeTextActivityList text={fallback} kind="done" />
        </div>
      );
    }
    return <Section label={label} text={null} />;
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="space-y-1">
        {done.map((a) => (
          <div key={a.id} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap leading-relaxed">{a.description}</span>
          </div>
        ))}
        {inactive.map((a) => (
          <div key={a.id} className="flex items-start gap-2 text-sm">
            <XCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap leading-relaxed text-muted-foreground line-through">
              {a.description}
            </span>
            <Badge variant="outline" className="text-[10px]">Inativada</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannedSection({
  label,
  planned,
  fallback,
}: {
  label: string;
  planned: DevDailyActivity[];
  fallback: string | null;
}) {
  if (planned.length === 0) {
    if (fallback?.trim()) {
      return (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
          <FreeTextActivityList text={fallback} kind="pending" />
        </div>
      );
    }
    return <Section label={label} text={null} />;
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="space-y-1">
        {planned.map((a) => (
          <div key={a.id} className="flex items-start gap-2 text-sm">
            <Circle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap leading-relaxed">{a.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyAIDetail({ insights }: { insights: AIInsights }) {
  return (
    <div className="space-y-4">
      {insights.resumo_executivo && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo Executivo</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground italic">{insights.resumo_executivo}</p></CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Avanços</CardTitle></CardHeader>
          <CardContent>
            {!insights.avancos?.length ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.avancos.map((a, i) => <li key={i} className="text-xs flex gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />{a}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Riscos</CardTitle></CardHeader>
          <CardContent>
            {!insights.riscos?.length ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.riscos.map((r, i) => <li key={i} className="text-xs flex gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />{r}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-red-600" /> Recorrências</CardTitle></CardHeader>
          <CardContent>
            {!insights.recorrencias?.length ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.recorrencias.map((r, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-start justify-between gap-1.5">
                    <span>{r.descricao}</span>
                    <Badge variant="destructive" className="text-[10px] flex-shrink-0">{r.dias_consecutivos}d</Badge>
                  </div>
                  {r.responsavel && <p className="text-[10px] text-muted-foreground">Resp: {r.responsavel}</p>}
                </li>
              ))}</ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}