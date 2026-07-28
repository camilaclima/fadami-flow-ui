import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, Users, RefreshCcw, AlertOctagon, CircleCheck, Calendar, AlertTriangle, CircleDashed, FileText, TrendingUp, Flame, X, Eye, ClipboardList } from "lucide-react";
import { History, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSquads } from "@/hooks/useSquads";
import { useDevDailyEntriesByDate } from "@/hooks/useDevDailyEntries";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { useDevDailyActivitiesByEntries, useDevDailyActivitiesByUsers } from "@/hooks/useDevDailyActivities";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import { MessageSquarePlus } from "lucide-react";
import { useGenerateDailyInsights, useAnalyzeScopeStuck, type DailyInsight, type ScopeAlert } from "@/hooks/useDailyInsights";
import { useProfiles } from "@/hooks/useProfiles";
import { IniciarDailyModal } from "@/components/dailys/IniciarDailyModal";
import { DevHistoryModal } from "@/components/dailys/DevHistoryModal";
import HistoricoPage from "./HistoricoPage";
import SaudePage from "./SaudePage";
import RelatorioExecutivoPage from "./RelatorioExecutivoPage";
import { useDailySim } from "@/contexts/DailySimContext";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import { formatDuration, formatOpenFor } from "@/lib/formatDuration";
import { FreeTextActivityList } from "@/lib/dailyFreeText";
import { buildYesterdayTodayLists } from "@/lib/dailyActivitiesView";

function daysAgoLabel(iso: string): string {
  const created = new Date(iso);
  const now = new Date();
  const startCreated = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((startNow - startCreated) / 86400000);
  if (days <= 0) return "Criado hoje";
  if (days === 1) return "Há 1 dia";
  return `Há ${days} dias`;
}

/** Retorna a data (YYYY-MM-DD) do último dia útil anterior à data atual.
 *  Segunda-feira → sexta anterior. Sábado/Domingo → sexta anterior. */
function previousBusinessDayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  // Normaliza para meia-noite local antes de serializar.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PainelGPPage() {
  const { current: sim, loading: simLoading } = useDailySim();
  const { user } = useAuth();
  const isFabio = (user?.email ?? "").toLowerCase() === "fabio@fadami.com.br";
  const [date, setDate] = useState<string>(previousBusinessDayISO());
  // Mantém a data sempre apontando para o último dia útil anterior
  // (atualiza automaticamente após a virada do dia, sem reload).
  useEffect(() => {
    const id = setInterval(() => {
      const t = previousBusinessDayISO();
      setDate((cur) => (cur === t ? cur : t));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  const [scopeAlerts, setScopeAlerts] = useState<ScopeAlert[]>([]);
  const [scopeAnalyzed, setScopeAnalyzed] = useState(false);
  const [scopeObservations, setScopeObservations] = useState<Record<number, string>>({});
  const [openObservationIndex, setOpenObservationIndex] = useState<number | null>(null);
  const scopeMut = useAnalyzeScopeStuck();

  const { data: allSquads = [] } = useSquads();
  const squads = useMemo(() => {
    if (sim.role === "diretor") return allSquads;
    const allowed = new Set(sim.squadIds ?? []);
    return allSquads.filter((s: any) => allowed.has(s.id));
  }, [allSquads, sim]);

  // GP só pode olhar squads onde é responsável.
  // Se nenhuma squad selecionada, o GP enxerga a primeira; o Diretor enxerga "todas".
  const effectiveSquadId = useMemo(() => {
    if (sim.role === "gp") {
      if (squadId && (sim.squadIds ?? []).includes(squadId)) return squadId;
      return squads[0]?.id ?? null;
    }
    return squadId;
  }, [sim, squadId, squads]);

  const { data: profiles = [] } = useProfiles();
  const { data: entries = [], isLoading } = useDevDailyEntriesByDate(date, effectiveSquadId);
  const gen = useGenerateDailyInsights();
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [historyDev, setHistoryDev] = useState<{ userId: string; name: string } | null>(null);

  // Encontro (daily_meetings) já encerrado para esta squad+data → trava o botão "Iniciar Daily".
  const { data: existingMeeting = null } = useQuery({
    queryKey: ["daily_meetings", "lock", date, effectiveSquadId ?? "all"],
    enabled: !!effectiveSquadId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meetings") as any)
        .select("id, created_at, conducted_by")
        .eq("meeting_date", date)
        .eq("squad_id", effectiveSquadId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; created_at: string; conducted_by: string | null } | null;
    },
  });
  const dailyClosed = !!existingMeeting;

  // Membros da squad selecionada (para mostrar quem ainda não preencheu).
  const { data: squadProfiles = [] } = useQuery({
    queryKey: ["squad_profiles", effectiveSquadId ?? "none"],
    enabled: !!effectiveSquadId,
    queryFn: async () => {
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id")
        .eq("squad_id", effectiveSquadId);
      const tmIds = (sm ?? []).map((r: any) => r.team_member_id);
      if (tmIds.length === 0) return [] as { user_id: string | null; name: string; email: string | null }[];
      const { data: tms } = await (supabase.from("team_members") as any)
        .select("id,email,name").in("id", tmIds);
      const emails = (tms ?? []).map((t: any) => String(t.email ?? "").trim().toLowerCase()).filter(Boolean);
      const names = (tms ?? []).map((t: any) => String(t.name ?? "").trim().toLowerCase()).filter(Boolean);
      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id,email,first_name,last_name");
      const byEmail = new Map<string, any>();
      const byName = new Map<string, any>();
      (profs ?? []).forEach((p: any) => {
        const em = String(p.email ?? "").trim().toLowerCase();
        const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
        if (em) byEmail.set(em, p);
        if (full) byName.set(full, p);
      });
      const mapped = (tms ?? []).map((t: any) => {
        const em = String(t.email ?? "").trim().toLowerCase();
        const nm = String(t.name ?? "").trim().toLowerCase();
        const p = (em && byEmail.get(em)) || (nm && byName.get(nm)) || null;
        return {
          user_id: p?.user_id ?? null,
          name: t.name as string,
          email: t.email as string | null,
        };
      }) as { user_id: string | null; name: string; email: string | null }[];
      // Dedupe defensivo: mesma pessoa cadastrada mais de uma vez
      // (registros legados sem e-mail). Mantém o que tem user_id/e-mail.
      const dedup = new Map<string, (typeof mapped)[number]>();
      mapped.forEach((m) => {
        const key =
          m.user_id ??
          String(m.email ?? "").trim().toLowerCase() ??
          String(m.name ?? "").trim().toLowerCase();
        const k = key || String(m.name ?? "").trim().toLowerCase();
        const prev = dedup.get(k);
        if (!prev || (!prev.user_id && m.user_id) || (!prev.email && m.email)) {
          dedup.set(k, m);
        }
      });
      // Também remove duplicatas por nome quando um dos registros não tem vínculo.
      const byNameKey = new Map<string, (typeof mapped)[number]>();
      Array.from(dedup.values()).forEach((m) => {
        const nk = String(m.name ?? "").trim().toLowerCase();
        const prev = byNameKey.get(nk);
        if (!prev || (!prev.user_id && m.user_id) || (!prev.email && m.email)) {
          byNameKey.set(nk, m);
        }
      });
      return Array.from(byNameKey.values());
    },
  });

  // Para mostrar impedimentos visíveis no dia D (criados <= D, ainda em aberto
  // ou sanados >= D), precisamos de TODAS as entries dos mesmos usuários até D.
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    entries.forEach((e) => ids.add(e.user_id));
    squadProfiles.forEach((p) => { if (p.user_id) ids.add(p.user_id); });
    return Array.from(ids);
  }, [entries, squadProfiles]);
  const { data: userEntries = [] } = useQuery({
    queryKey: [
      "dev_daily_entries",
      "by-users-upto",
      date,
      effectiveSquadId ?? "all",
      userIds.sort().join(","),
    ],
    enabled: userIds.length > 0 && !!effectiveSquadId,
    queryFn: async () => {
      // Entries desta squad (novas)
      const { data: bySquad, error: e1 } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds)
        .eq("squad_id", effectiveSquadId)
        .lte("entry_date", date);
      if (e1) throw e1;
      // Fallback legado: entries sem squad_id atribuído
      const { data: legacy, error: e2 } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds)
        .is("squad_id", null)
        .lte("entry_date", date);
      if (e2) throw e2;
      const map = new Map<string, { id: string; user_id: string; entry_date: string }>();
      [...(bySquad ?? []), ...(legacy ?? [])].forEach((r: any) => map.set(r.id, r));
      return Array.from(map.values());
    },
  });
  const allEntryIds = useMemo(() => userEntries.map((e) => e.id), [userEntries]);
  const { data: allImpediments = [] } = useDevDailyImpedimentsByEntries(allEntryIds);


  const impsByUser = useMemo(() => {
    const entryDateById = new Map(userEntries.map((e) => [e.id, e]));
    const m = new Map<string, typeof allImpediments>();
    allImpediments.forEach((imp) => {
      const origin = entryDateById.get(imp.entry_id);
      if (!origin) return;
      if (origin.entry_date > date) return;
      if (imp.resolved) {
        const rd = imp.resolved_at ? imp.resolved_at.slice(0, 10) : null;
        if (rd && rd < date) return;
      }
      const list = m.get(origin.user_id) ?? [];
      list.push(imp);
      m.set(origin.user_id, list);
    });
    return m;
  }, [allImpediments, userEntries, date]);

  const profileByUser = useMemo(() => {
    const m = new Map<string, any>();
    profiles.forEach((p: any) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  // Universo de impedimentos da squad SEM filtro de data (para a área "Todos os impedimentos").
  const { data: allUserEntries = [] } = useQuery({
    queryKey: [
      "dev_daily_entries",
      "by-users-all",
      effectiveSquadId ?? "all",
      userIds.sort().join(","),
    ],
    enabled: userIds.length > 0 && !!effectiveSquadId,
    queryFn: async () => {
      const { data: bySquad, error: e1 } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds)
        .eq("squad_id", effectiveSquadId);
      if (e1) throw e1;
      const { data: legacy, error: e2 } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds)
        .is("squad_id", null);
      if (e2) throw e2;
      const map = new Map<string, { id: string; user_id: string; entry_date: string }>();
      [...(bySquad ?? []), ...(legacy ?? [])].forEach((r: any) => map.set(r.id, r));
      return Array.from(map.values());
    },
  });
  const allUserEntryIds = useMemo(() => allUserEntries.map((e) => e.id), [allUserEntries]);
  const { data: squadAllImpediments = [] } = useDevDailyImpedimentsByEntries(allUserEntryIds);
  const [impFilter, setImpFilter] = useState<"all" | "open" | "resolved">("open");
  const reporterByEntry = useMemo(() => {
    const m = new Map<string, string>();
    const nameByUser = new Map<string, string>();
    squadProfiles.forEach((sp) => { if (sp.user_id) nameByUser.set(sp.user_id, sp.name); });
    allUserEntries.forEach((e) => {
      const p = profileByUser.get(e.user_id);
      const fromProfile = p ? (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email) : null;
      m.set(e.id, fromProfile || nameByUser.get(e.user_id) || "—");
    });
    return m;
  }, [allUserEntries, profileByUser, squadProfiles]);
  const filteredSquadImps = useMemo(() => {
    const list = squadAllImpediments.filter((i) => {
      if (impFilter === "open") return !i.resolved;
      if (impFilter === "resolved") return i.resolved;
      return true;
    });
    return [...list].sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [squadAllImpediments, impFilter]);
  const openImpsCount = squadAllImpediments.filter((i) => !i.resolved).length;
  const resolvedImpsCount = squadAllImpediments.filter((i) => i.resolved).length;

  const rows = useMemo(() => {
    return entries.map(e => {
      const p = profileByUser.get(e.user_id);
      const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : e.user_id;
      const imps = impsByUser.get(e.user_id) ?? [];
      return { ...e, dev_name: name, imps };
    });
  }, [entries, profileByUser, impsByUser]);

  // Lista unificada: todos os membros da squad, marcando quem preencheu.
  const memberRows = useMemo(() => {
    if (!effectiveSquadId) {
      return rows.map((r) => ({
        key: r.id,
        name: r.dev_name,
        filled: true as const,
        entry: r,
        imps: r.imps,
      }));
    }
    const entryByUser = new Map(rows.map((r) => [r.user_id, r]));
    const out: Array<{
      key: string;
      name: string;
      filled: boolean;
      entry: (typeof rows)[number] | null;
      imps: typeof allImpediments;
    }> = [];
    squadProfiles.forEach((m) => {
      const r = m.user_id ? entryByUser.get(m.user_id) ?? null : null;
      const imps = (m.user_id && impsByUser.get(m.user_id)) || [];
      out.push({
        key: m.user_id ?? m.email ?? m.name,
        name: m.name,
        filled: !!r,
        entry: r,
        imps,
      });
    });
    // Garante que entries de devs fora da squad também apareçam (fallback).
    rows.forEach((r) => {
      if (!out.find((o) => o.entry?.id === r.id) && !squadProfiles.find((m) => m.user_id === r.user_id)) {
        out.push({ key: r.id, name: r.dev_name, filled: true, entry: r, imps: r.imps });
      }
    });
    return out.sort((a, b) => Number(b.filled) - Number(a.filled) || a.name.localeCompare(b.name));
  }, [effectiveSquadId, rows, squadProfiles, impsByUser, allImpediments]);

  // ---------- KPIs ----------
  const totalMembers = effectiveSquadId ? squadProfiles.length : rows.length;
  const filledCount = memberRows.filter((m) => m.filled).length;
  const aderencia = totalMembers > 0 ? Math.round((filledCount / totalMembers) * 100) : 0;

  // Universo de impedimentos da squad (todos relacionados aos membros) — usado
  // como proxy de "impedimentos da sprint" enquanto não há vínculo com sprint.
  const totalImps = allImpediments.length;
  const resolvedImps = allImpediments.filter((i) => i.resolved).length;

  // Devs travados: dev com impedimento em aberto há mais de 48h.
  const TRAVADO_MS = 48 * 60 * 60 * 1000;
  const now = Date.now();
  const stuckUserIds = useMemo(() => {
    const ids = new Set<string>();
    const entryById = new Map(userEntries.map((e) => [e.id, e]));
    allImpediments.forEach((imp) => {
      if (imp.resolved) return;
      const created = new Date(imp.created_at).getTime();
      if (now - created < TRAVADO_MS) return;
      const origin = entryById.get(imp.entry_id);
      if (origin) ids.add(origin.user_id);
    });
    return ids;
  }, [allImpediments, userEntries, now]);
  const stuckCount = stuckUserIds.size;

  // Histórico dos últimos 7 dias para análise de escopo via IA.
  const sevenDaysAgo = useMemo(() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, [date]);
  const { data: recentEntries = [] } = useQuery({
    queryKey: ["dev_daily_entries", "recent-7d", date, userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("user_id,entry_date,did_yesterday,will_do_today")
        .in("user_id", userIds)
        .gte("entry_date", sevenDaysAgo)
        .lte("entry_date", date)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { user_id: string; entry_date: string; did_yesterday: string | null; will_do_today: string | null }[];
    },
  });

  const handleAnalyzeScope = async () => {
    const byUser = new Map<string, { dev_name: string; entries: { date: string; will_do_today?: string; did_yesterday?: string }[] }>();
    recentEntries.forEach((e) => {
      const p = profileByUser.get(e.user_id);
      const nameFromProfile = p ? (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email) : null;
      const nameFromSquad = squadProfiles.find((sp) => sp.user_id === e.user_id)?.name ?? null;
      const dev_name = nameFromProfile || nameFromSquad || "Dev";
      const cur = byUser.get(e.user_id) ?? { dev_name, entries: [] };
      cur.entries.push({
        date: e.entry_date,
        will_do_today: e.will_do_today ?? undefined,
        did_yesterday: e.did_yesterday ?? undefined,
      });
      byUser.set(e.user_id, cur);
    });
    const devs = Array.from(byUser.values()).filter((d) => d.entries.length >= 2);
    const result = await scopeMut.mutateAsync(devs);
    setScopeAlerts(result);
    setScopeAnalyzed(true);
  };

  const detailRow = useMemo(() => rows.find((r) => r.id === detailEntryId) ?? null, [rows, detailEntryId]);
  const detailActivities = useDevDailyActivitiesByEntries(detailRow ? [detailRow.id] : []);
  // Também precisa das atividades do usuário para detectar carry-over pendente.
  // Escopo por squad para não misturar atividades do dev em outra squad.
  const detailUserActivities = useDevDailyActivitiesByUsers(
    detailRow ? [detailRow.user_id] : [],
    effectiveSquadId,
  );
  const detailLists = useMemo(() => {
    if (!detailRow) return null;
    const acts = (detailUserActivities.data ?? []).filter(
      (a) => a.user_id === detailRow.user_id,
    );
    const entriesForUser = userEntries.filter((e) => e.user_id === detailRow.user_id);
    return buildYesterdayTodayLists({
      entry: { id: detailRow.id, entry_date: detailRow.entry_date },
      activities: acts,
      entriesForUser,
      date: detailRow.entry_date,
    });
  }, [detailRow, detailUserActivities.data, userEntries]);

  const handleGenerate = async () => {
    const result = await gen.mutateAsync(rows.map(r => ({
      dev_name: r.dev_name,
      did_yesterday: r.did_yesterday ?? "",
      will_do_today: r.will_do_today ?? "",
      impediments: r.impediments ?? "",
    })));
    setInsights(result);
  };

  // ---------- Resumo da Daily (IA) ----------
  type DailySummaryInsights = {
    resumo_executivo?: string;
    resumo_curto?: string;
    avancos?: string[];
    riscos?: string[];
    recorrencias?: Array<string | { titulo?: string; responsavel?: string; dias?: number }>;
    blocker_level?: number;
  };
  const [summary, setSummary] = useState<DailySummaryInsights | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const lastSummaryKey = useRef<string>("");

  const summaryKey = useMemo(() => {
    return [
      date,
      effectiveSquadId ?? "all",
      ...rows.map((r) => `${r.id}:${r.updated_at}`),
    ].join("|");
  }, [date, effectiveSquadId, rows]);

  const buildCompositeForSummary = () => {
    const blocks = rows
      .filter((r) => (r.did_yesterday || r.will_do_today || r.impediments))
      .map((r) => {
        const parts: string[] = [];
        if (r.did_yesterday) parts.push(`Ontem: ${r.did_yesterday}`);
        if (r.will_do_today) parts.push(`Hoje: ${r.will_do_today}`);
        const openImps = r.imps.filter((i) => !i.resolved);
        if (openImps.length > 0) {
          parts.push(`Impedimentos: ${openImps.map((i) => i.description).join(" | ")}`);
        } else if (r.impediments) {
          parts.push(`Impedimentos: ${r.impediments}`);
        }
        return `=== ${r.dev_name} ===\n${parts.join("\n")}`;
      });
    return blocks.join("\n\n");
  };

  const refreshSummary = async (opts?: { silent?: boolean }) => {
    if (rows.length === 0) {
      setSummary(null);
      lastSummaryKey.current = summaryKey;
      return;
    }
    const composite = buildCompositeForSummary();
    if (!composite.trim()) {
      setSummary(null);
      lastSummaryKey.current = summaryKey;
      return;
    }
    const presentNames = rows.map((r) => r.dev_name);
    if (!opts?.silent) setSummaryLoading(true);
    setSummaryError(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-daily-status", {
        body: {
          todaySummary: composite,
          presentMembers: presentNames,
          history: [],
          masterContext: "",
          masterBacklog: [],
        },
      });
      if (error) throw error;
      setSummary((data?.insights ?? null) as DailySummaryInsights | null);
      lastSummaryKey.current = summaryKey;
    } catch (e: any) {
      setSummaryError(e?.message ?? "Erro ao gerar resumo");
    } finally {
      setSummaryLoading(false);
    }
  };

  // Atualiza automaticamente o resumo conforme os devs vão preenchendo.
  useEffect(() => {
    if (rows.length === 0) {
      setSummary(null);
      lastSummaryKey.current = "";
      return;
    }
    if (lastSummaryKey.current === summaryKey) return;
    const t = setTimeout(() => { refreshSummary({ silent: !!summary }); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryKey]);

  // Auto-análise de escopo conforme as dailies chegam.
  useEffect(() => {
    if (scopeMut.isPending || recentEntries.length === 0) return;
    const byUser = new Map<string, { dev_name: string; entries: { date: string; will_do_today?: string; did_yesterday?: string }[] }>();
    recentEntries.forEach((e) => {
      const p = profileByUser.get(e.user_id);
      const nameFromProfile = p ? (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email) : null;
      const nameFromSquad = squadProfiles.find((sp) => sp.user_id === e.user_id)?.name ?? null;
      const dev_name = nameFromProfile || nameFromSquad || "Dev";
      const cur = byUser.get(e.user_id) ?? { dev_name, entries: [] };
      cur.entries.push({
        date: e.entry_date,
        will_do_today: e.will_do_today ?? undefined,
        did_yesterday: e.did_yesterday ?? undefined,
      });
      byUser.set(e.user_id, cur);
    });
    const devs = Array.from(byUser.values()).filter((d) => d.entries.length >= 2);
    if (devs.length === 0) {
      setScopeAlerts([]);
      setScopeAnalyzed(true);
      return;
    }
    scopeMut.mutateAsync(devs).then((result) => {
      setScopeAlerts(result);
      setScopeAnalyzed(true);
    }).catch(() => {
      // erro já tratado no mutation onError
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentEntries]);

  // Reseta análise de escopo ao trocar squad/data para não vazar alertas de outra squad.
  useEffect(() => {
    setScopeAlerts([]);
    setScopeAnalyzed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSquadId, date]);

  // Nomes permitidos = membros da squad selecionada (ou devs que preencheram, quando "todas").
  const allowedDevNames = useMemo(() => {
    const names = new Set<string>();
    userIds.forEach((uid) => {
      const p = profileByUser.get(uid);
      const nameFromProfile = p ? (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email) : null;
      const nameFromSquad = squadProfiles.find((sp) => sp.user_id === uid)?.name ?? null;
      const n = nameFromProfile || nameFromSquad;
      if (n) names.add(n.trim().toLowerCase());
    });
    return names;
  }, [userIds, profileByUser, squadProfiles]);

  const visibleScopeAlerts = useMemo(() => {
    if (allowedDevNames.size === 0) return scopeAlerts;
    return scopeAlerts.filter((a) => allowedDevNames.has((a.dev_name ?? "").trim().toLowerCase()));
  }, [scopeAlerts, allowedDevNames]);

  if (simLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sim.roles?.includes("gp") && sim.role !== "diretor") {
    return (
      <AccessDeniedCard message="Desenvolvedores não têm acesso ao Painel do GP. Selecione um perfil de GP ou Diretor no seletor acima." />
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel da Daily</h1>
          <p className="text-sm text-muted-foreground">
            Centralize as dailys, identifique bloqueios e destrave o fluxo das suas squads.
          </p>
        </div>
      </div>

      <Tabs defaultValue="painel" className="w-full">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="painel" className="gap-2"><Sparkles className="w-4 h-4" /> Painel</TabsTrigger>
            <TabsTrigger value="historico" className="gap-2"><History className="w-4 h-4" /> Histórico</TabsTrigger>
            <TabsTrigger value="saude" className="gap-2"><Activity className="w-4 h-4" /> Saúde & Engajamento</TabsTrigger>
            {(sim.role === "diretor" || isFabio) && (
              <TabsTrigger value="relatorio" className="gap-2">
                <ClipboardList className="w-4 h-4" /> Relatório Executivo
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="mb-1.5 block text-xs">Squad</Label>
              <Select
                value={effectiveSquadId ?? "__all__"}
                onValueChange={(v) => setSquadId(v === "__all__" ? null : v)}
              >
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sim.role === "diretor" && <SelectItem value="__all__">Todas as squads</SelectItem>}
                  {squads.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setOpenModal(true)}
              disabled={dailyClosed}
              className="rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
              title={dailyClosed && existingMeeting?.created_at
                ? `Daily encerrada em ${format(parseISO(existingMeeting.created_at), "dd/MM 'às' HH:mm")}`
                : undefined}
            >
              <Play className="w-4 h-4" />
              {dailyClosed ? "Daily encerrada" : "Iniciar Daily"}
            </Button>
          </div>
        </div>

        <TabsContent value="painel" className="mt-0">
      {/* Status de preenchimento + Resumo da Daily */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Status de preenchimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && memberRows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum membro encontrado para esta squad.</p>}
            {memberRows.map((m) => {
              const impCount = m.imps.length;
              const clickable = m.filled && !!m.entry;
              return (
                <div
                  key={m.key}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={() => clickable && setDetailEntryId(m.entry!.id)}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setDetailEntryId(m.entry!.id);
                    }
                  }}
                  className={`flex items-start justify-between gap-2 p-3 rounded-xl transition-colors ${
                    m.filled
                      ? "bg-surface-hover/40 hover:bg-surface-hover/70 cursor-pointer"
                      : "bg-muted/20 border border-dashed border-border/60"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {m.filled ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                        <CircleCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted-foreground/40 text-white shrink-0 mt-0.5">
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className={`text-sm font-medium block break-words ${m.filled ? "" : "text-muted-foreground"}`}>
                        {m.entry?.dev_name ?? m.name}
                        {formatDuration((m.entry as any)?.fill_duration_seconds) && (
                          <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-primary" title="Tempo de preenchimento do dev">
                            <Clock className="w-2.5 h-2.5" /> {formatDuration((m.entry as any).fill_duration_seconds)}
                          </span>
                        )}
                      </span>
                      {impCount > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {impCount} impedimento{impCount !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  {clickable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailEntryId(m.entry!.id);
                      }}
                      aria-label="Ver preenchimento"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Resumo da Daily */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Resumo da Daily
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="capitalize">
                  {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => refreshSummary()}
              disabled={summaryLoading || rows.length === 0}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${summaryLoading ? "animate-spin" : ""}`} />
              {summary ? "Atualizar resumo" : "Gerar resumo"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ninguém preencheu a daily do último dia útil. O resumo aparecerá aqui assim que houver pelo menos um registro.
              </p>
            )}
            {rows.length > 0 && !summary && !summaryLoading && !summaryError && (
              <p className="text-sm text-muted-foreground">Gerando resumo…</p>
            )}
            {summaryLoading && (
              <p className="text-sm text-muted-foreground">Analisando relatos com IA…</p>
            )}
            {summaryError && (
              <p className="text-sm text-red-600">{summaryError}</p>
            )}
            {summary && (
              <>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">Resumo Executivo</p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/90 italic">
                    {summary.resumo_executivo || summary.resumo_curto || "Sem resumo disponível."}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-4 h-4" /> Avanços
                    </p>
                    {(summary.avancos ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nada registrado.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(summary.avancos ?? []).map((a, i) => (
                          <li key={i} className="text-xs flex gap-1.5 text-foreground/90">
                            <CircleCheck className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="break-words">{a}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Riscos
                    </p>
                    {(summary.riscos ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum risco identificado.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(summary.riscos ?? []).map((r, i) => (
                          <li key={i} className="text-xs flex gap-1.5 text-foreground/90">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span className="break-words">{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  </div>
                  {/* Indicador de Escopo */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Indicador de Escopo
                  </p>
                  {scopeMut.isPending && (
                    <p className="text-xs text-muted-foreground">Analisando dailies dos últimos 7 dias…</p>
                  )}
                  {!scopeMut.isPending && visibleScopeAlerts.length === 0 && scopeAnalyzed && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <CircleCheck className="w-4 h-4" />
                      Nenhum dev preso na mesma tarefa. Escopo fluindo bem.
                    </div>
                  )}
                  {visibleScopeAlerts.length > 0 && (
                    <div className="space-y-2">
                      {visibleScopeAlerts.map((a, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl border bg-amber-500/5 border-amber-500/30">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{a.message}</p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">{a.dev_name}</span>
                              <span>•</span>
                              <span>Tarefa: {a.task}</span>
                              <Badge variant="outline" className="text-[10px] ml-1 bg-amber-500/10 text-amber-700 border-amber-500/30">
                                {a.days} dias
                              </Badge>
                            </div>
                          </div>
                          <Popover open={openObservationIndex === i} onOpenChange={(open) => setOpenObservationIndex(open ? i : null)}>
                            <PopoverTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Adicionar observação"
                              >
                                <MessageSquarePlus className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 rounded-xl" align="end">
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Observação do indicador</p>
                                <Textarea
                                  placeholder="Digite a observação..."
                                  value={scopeObservations[i] ?? ""}
                                  onChange={(e) => setScopeObservations((prev) => ({ ...prev, [i]: e.target.value }))}
                                  className="min-h-[80px] rounded-xl text-sm"
                                />
                                <div className="flex justify-end">
                                  <Button size="sm" className="rounded-xl gap-2" onClick={() => setOpenObservationIndex(null)}>
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Impedimentos da Squad */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-orange-500" /> Impedimentos da Squad
            <span className="text-xs font-normal text-muted-foreground ml-1">(todas as datas)</span>
          </CardTitle>
          <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
            <Button
              size="sm"
              variant={impFilter === "open" ? "default" : "ghost"}
              className="rounded-lg h-7 px-3 text-xs"
              onClick={() => setImpFilter("open")}
            >
              Pendentes <span className="ml-1 opacity-70">({openImpsCount})</span>
            </Button>
            <Button
              size="sm"
              variant={impFilter === "resolved" ? "default" : "ghost"}
              className="rounded-lg h-7 px-3 text-xs"
              onClick={() => setImpFilter("resolved")}
            >
              Sanados <span className="ml-1 opacity-70">({resolvedImpsCount})</span>
            </Button>
            <Button
              size="sm"
              variant={impFilter === "all" ? "default" : "ghost"}
              className="rounded-lg h-7 px-3 text-xs"
              onClick={() => setImpFilter("all")}
            >
              Todos <span className="ml-1 opacity-70">({squadAllImpediments.length})</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSquadImps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum impedimento encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredSquadImps.map((imp) => {
                const reporter = reporterByEntry.get(imp.entry_id) || "—";
                const dateLabel = imp.resolved && imp.resolved_at
                  ? `Sanado em ${format(parseISO(imp.resolved_at), "dd/MM", { locale: ptBR })}`
                  : daysAgoLabel(imp.created_at);
                return (
                  <div
                    key={imp.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                      imp.resolved
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-orange-500/5 border-orange-500/20"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {imp.resolved ? (
                        <CircleCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 break-words">
                        {imp.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{reporter}</span>
                        <span>•</span>
                        <span>{dateLabel}</span>
                        <Badge variant="outline" className={`text-[10px] ml-1 ${URGENCY_STYLES[imp.urgency]}`}>
                          {URGENCY_LABELS[imp.urgency]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <HistoricoPage filterSquadId={effectiveSquadId} />
        </TabsContent>

        <TabsContent value="saude" className="mt-0">
          <SaudePage />
        </TabsContent>

        {(sim.role === "diretor" || isFabio) && (
          <TabsContent value="relatorio" className="mt-0">
            <RelatorioExecutivoPage savedOnly={isFabio && sim.role !== "diretor"} />
          </TabsContent>
        )}
      </Tabs>

      <IniciarDailyModal
        open={openModal}
        onOpenChange={setOpenModal}
        date={date}
        squadId={effectiveSquadId}
        members={memberRows.map((m) => ({
          key: m.key,
          name: m.name,
          filled: m.filled,
          entry: m.entry
            ? {
                id: m.entry.id,
                user_id: m.entry.user_id,
                did_yesterday: m.entry.did_yesterday,
                will_do_today: m.entry.will_do_today,
                impediments: m.entry.impediments,
                general_notes: (m.entry as any).general_notes ?? null,
              }
            : null,
          imps: m.imps,
        }))}
      />

      <Dialog open={!!detailEntryId} onOpenChange={(o) => !o && setDetailEntryId(null)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-8">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {detailRow?.dev_name} — {format(parseISO(date), "PPP", { locale: ptBR })}
              </span>
              {detailRow && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-1.5"
                  onClick={() => setHistoryDev({ userId: detailRow.user_id, name: detailRow.dev_name })}
                >
                  <History className="w-4 h-4" /> Histórico
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">Ontem</p>
                  {(() => {
                    const acts = detailLists?.yesterday ?? [];
                    if (acts.length === 0) return (
                      <FreeTextActivityList
                        text={detailRow.did_yesterday}
                        kind="done"
                        emptyFallback={<p className="text-sm text-muted-foreground">—</p>}
                        keyPrefix={`pgp-y-${detailRow.id}`}
                      />
                    );
                    return (
                      <div className="space-y-1.5">
                        {acts.map((a) => (
                          <DevActivityCard key={a.id} kind={a.status === "concluida" ? "done" : a.status === "inativa" ? "inactive" : "pending"} description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="rounded-xl border bg-primary/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80 mb-1.5">Hoje</p>
                  {(() => {
                    // "Hoje" = atividades pendentes criadas neste próprio registro
                    // (mesma regra da visão do líder, evita mistura com carry-over).
                    const acts = detailLists?.today ?? [];
                    if (acts.length === 0) return (
                      <FreeTextActivityList
                        text={detailRow.will_do_today}
                        kind="pending"
                        emptyFallback={<p className="text-sm text-muted-foreground">—</p>}
                        keyPrefix={`pgp-t-${detailRow.id}`}
                      />
                    );
                    return (
                      <div className="space-y-1.5">
                        {acts.map((a) => (
                          <DevActivityCard key={a.id} kind="pending" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MessageSquarePlus className="w-3 h-3" /> Observações gerais do dev
                </p>
                {(detailRow as any).general_notes?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{(detailRow as any).general_notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma observação geral registrada.</p>
                )}
              </div>
              <div className="rounded-xl border bg-orange-500/5 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-orange-600 mb-2 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> Impedimentos
                </p>
                {(() => {
                  // Todos os impedimentos visíveis para este dia:
                  // criados até D e ainda em aberto, OU sanados em D.
                  // detailRow.imps já vem filtrado por impsByUser conforme essa regra.
                  const dayImps = detailRow.imps;
                  return dayImps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum impedimento registrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayImps.map((imp) => {
                      const origin = userEntries.find((e) => e.id === imp.entry_id);
                      const createdBadge = origin && origin.entry_date !== date ? (() => {
                        const suffix = imp.resolved && imp.resolved_at
                          ? ` — aberto por ${formatOpenFor(origin.entry_date, imp.resolved_at)}`
                          : ` — há ${formatOpenFor(origin.entry_date)}`;
                        return (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            Criado em {format(parseISO(origin.entry_date), "dd/MM", { locale: ptBR })}{suffix}
                          </Badge>
                        );
                      })() : null;
                      return (
                        <div key={imp.id} className="rounded-lg border bg-background/70 p-2 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                              {URGENCY_LABELS[imp.urgency]}
                            </Badge>
                            {createdBadge}
                            {imp.resolved ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                                <CircleCheck className="w-2.5 h-2.5" /> Sanado
                                {imp.resolved_at && (
                                  <span className="font-normal">em {format(parseISO(imp.resolved_at), "dd/MM", { locale: ptBR })}</span>
                                )}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                                Em aberto
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                        </div>
                      );
                    })}
                  </div>
                );
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailEntryId(null)} className="rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DevHistoryModal
        open={!!historyDev}
        onOpenChange={(o) => !o && setHistoryDev(null)}
        userId={historyDev?.userId ?? null}
        name={historyDev?.name ?? ""}
      />
    </div>
  );
}
