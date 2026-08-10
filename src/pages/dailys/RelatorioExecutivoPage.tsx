import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Award,
  Trophy,
  AlertTriangle,
  CalendarX,
  Clock,
  HelpCircle,
  Repeat,
  AlertOctagon,
  Printer,
  Copy,
  FileText,
  Save,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Timer,
  CalendarOff,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { formatOpenFor, formatDuration } from "@/lib/formatDuration";
import { downloadElementAsPdf } from "@/lib/visualPdf";
import { useDailyEntryTagsByEntries } from "@/hooks/useDailyEntryTags";
import { DEV_ABSENCE_LABELS, type DevAbsenceType } from "@/hooks/useDevAbsences";
import {
  useDevDailyActivitiesByUsers,
  type DevDailyActivity,
} from "@/hooks/useDevDailyActivities";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import { FreeTextActivityList, splitFreeText } from "@/lib/dailyFreeText";
import {
  isAwaitingTask,
  isRepeatedFromPrev,
  isShortText,
  MANUAL_TAG_OPTIONS,
  type ManualTag,
} from "@/lib/executiveReportRules";
import { isExactSameTask, normalize } from "@/lib/executiveReportRules";
import {
  useCreateExecutiveReport,
  useDeleteExecutiveReport,
  useExecutiveReports,
  type ExecutiveReport,
} from "@/hooks/useExecutiveReports";

type SectionId =
  | "bom_exemplo"
  | "melhor_squad"
  | "preenchimento_incorreto"
  | "faltas"
  | "sem_pre_daily"
  | "aguardando"
  | "repetidas"
  | "impedimentos"
  | "acompanhamento_tempo"
  | "squads_sem_daily";

interface ReportItem {
  id: string;
  text: string;
  meta?: string;
  origin: "auto" | "manual" | "both";
  date?: string;
  subject: string;
  squadName?: string;
  entry?: any;
  impediments?: any[];
  done?: DevDailyActivity[];
  inactive?: DevDailyActivity[];
  planned?: DevDailyActivity[];
  stillPending?: DevDailyActivity[];
  extraDetails?: string;
  repeatDetails?: {
    sameDay?: { date: string; task: string };
    streak?: Array<{ date: string; task: string }>;
  };
  rank?: number;
  timeStats?: {
    meetingSec: number;
    devsSec: number;
    totalSec: number;
    avgSec: number | null;
    devsCount: number;
  };
}

interface ReportSection {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  origin: string;
  items: ReportItem[];
}

interface ItemState {
  included: boolean;
  text: string;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevBusinessDay(iso: string) {
  const d = parseISO(iso);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtShort(iso: string) {
  try {
    return format(parseISO(iso), "dd/MM", { locale: ptBR });
  } catch {
    return iso;
  }
}

function fmtLong(iso: string) {
  try {
    return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

export default function RelatorioExecutivoPage({ savedOnly = false }: { savedOnly?: boolean } = {}) {
  const [dateFrom, setDateFrom] = useState<string>(todayISO());
  const [dateTo, setDateTo] = useState<string>(todayISO());
  const effectiveFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const effectiveTo = dateFrom <= dateTo ? dateTo : dateFrom;
  // Faixa alargada para buscar entries do dia útil anterior a cada data do intervalo.
  const prevRangeFrom = useMemo(
    () => {
      // Vai 2 dias úteis a mais para trás para conseguir detectar
      // sequências de 3 dias consecutivos com a mesma tarefa.
      let iso = prevBusinessDay(effectiveFrom);
      iso = prevBusinessDay(iso);
      iso = prevBusinessDay(iso);
      return iso;
    },
    [effectiveFrom],
  );

  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();

  const squadById = useMemo(() => {
    const m = new Map<string, any>();
    (squads as any[]).forEach((s) => m.set(s.id, s));
    return m;
  }, [squads]);

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    (profiles as any[]).forEach((p) => {
      const nm = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || p.user_id;
      m.set(p.user_id, nm);
    });
    return m;
  }, [profiles]);

  // Todas as entries do dia (todas as squads).
  const { data: todayEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["exec-report", "entries", effectiveFrom, effectiveTo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,squad_id,entry_date,did_yesterday,will_do_today,impediments,general_notes,fill_completed_at,fill_duration_seconds,created_at")
        .gte("entry_date", effectiveFrom)
        .lte("entry_date", effectiveTo);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Entries que servem como "dia anterior" para qualquer dia do intervalo.
  const { data: prevEntries = [] } = useQuery({
    queryKey: ["exec-report", "prev-entries", prevRangeFrom, effectiveTo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,squad_id,entry_date,will_do_today")
        .gte("entry_date", prevRangeFrom)
        .lte("entry_date", effectiveTo);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Reuniões no intervalo (para "sem pré-daily no prazo").
  const { data: meetings = [] } = useQuery({
    queryKey: ["exec-report", "meetings", effectiveFrom, effectiveTo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meetings") as any)
        .select("id,squad_id,meeting_date,started_at,finished_at,duration_seconds,created_at")
        .gte("meeting_date", effectiveFrom)
        .lte("meeting_date", effectiveTo);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Ausências ativas que sobrepõem o intervalo do filtro.
  const { data: absences = [] } = useQuery({
    queryKey: ["exec-report", "absences", effectiveFrom, effectiveTo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_absences") as any)
        .select("*")
        .eq("active", true)
        .lte("start_date", effectiveTo)
        .gte("end_date", effectiveFrom);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Presenças das reuniões no intervalo (para faltas por não participação).
  const meetingIds = useMemo(
    () => (meetings as any[]).map((m) => m.id),
    [meetings],
  );
  const { data: attendance = [] } = useQuery({
    queryKey: ["exec-report", "attendance", meetingIds.sort().join(",")],
    enabled: meetingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_meeting_attendance") as any)
        .select("*")
        .in("meeting_id", meetingIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Membros de todas as squads (para "sem pré-daily no prazo").
  const { data: squadMembers = [] } = useQuery({
    queryKey: ["exec-report", "squad-members-all"],
    queryFn: async () => {
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("squad_id,team_member_id");
      const tmIds = Array.from(new Set((sm ?? []).map((r: any) => r.team_member_id)));
      if (tmIds.length === 0) return [] as any[];
      const { data: tms } = await (supabase.from("team_members") as any)
        .select("id,email,name").in("id", tmIds);
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
      const tmMap = new Map<string, { user_id: string | null; name: string }>();
      (tms ?? []).forEach((t: any) => {
        const em = String(t.email ?? "").trim().toLowerCase();
        const nm = String(t.name ?? "").trim().toLowerCase();
        const p = (em && byEmail.get(em)) || (nm && byName.get(nm)) || null;
        tmMap.set(t.id, { user_id: p?.user_id ?? null, name: t.name ?? "—" });
      });
      return (sm ?? []).map((r: any) => ({
        squad_id: r.squad_id,
        user_id: tmMap.get(r.team_member_id)?.user_id ?? null,
        name: tmMap.get(r.team_member_id)?.name ?? "—",
      }));
    },
  });

  const entryIds = useMemo(() => todayEntries.map((e: any) => e.id), [todayEntries]);
  const { data: manualTags = [] } = useDailyEntryTagsByEntries(entryIds);

  // Impedimentos: TODOS ainda em aberto (independente da data de criação)
  // + os sanados dentro do intervalo selecionado.
  const { data: rangeImpediments = [] } = useQuery({
    queryKey: ["exec-report", "impediments-range", effectiveFrom, effectiveTo],
    queryFn: async () => {
      const fromISO = `${effectiveFrom}T00:00:00`;
      const toISO = `${effectiveTo}T23:59:59.999`;
      const { data, error } = await (supabase.from("dev_daily_impediments") as any)
        .select("*")
        .or(
          `resolved.eq.false,and(resolved.eq.true,resolved_at.gte.${fromISO},resolved_at.lte.${toISO})`,
        );
      if (error) throw error;
      return data ?? [];
    },
  });

  // Entries referenciadas pelos impedimentos do intervalo (podem estar fora do range de entries).
  const impEntryIds = useMemo(
    () => Array.from(new Set((rangeImpediments as any[]).map((i) => i.entry_id).filter(Boolean))),
    [rangeImpediments],
  );
  const { data: impEntries = [] } = useQuery({
    queryKey: ["exec-report", "imp-entries", impEntryIds.sort().join(",")],
    enabled: impEntryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,squad_id,entry_date,did_yesterday,will_do_today,general_notes,fill_completed_at,created_at")
        .in("id", impEntryIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Impedimentos vigentes (para o card do dev no expandido/dedupe).
  const impediments = useMemo(
    () => rangeImpediments as any[],
    [rangeImpediments],
  );

  const userIdsForActivities = useMemo(
    () => Array.from(new Set((todayEntries as any[]).map((e) => e.user_id).filter(Boolean))),
    [todayEntries],
  );
  const { data: allActivities = [] } = useDevDailyActivitiesByUsers(userIdsForActivities);

  const activitiesByEntry = useMemo(() => {
    const done = new Map<string, DevDailyActivity[]>();
    const inactive = new Map<string, DevDailyActivity[]>();
    const planned = new Map<string, DevDailyActivity[]>();
    const stillPending = new Map<string, DevDailyActivity[]>();
    const entryById = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => entryById.set(e.id, e));
    // Inclui entries anteriores ao range para localizar a origem de atividades
    // que "arrastam" pendências de dias fora do intervalo consultado.
    (prevEntries as any[]).forEach((e) => {
      if (!entryById.has(e.id)) entryById.set(e.id, e);
    });

    allActivities.forEach((a) => {
      if (a.closed_entry_id && (a.status === "concluida" || a.status === "inativa")) {
        const map = a.status === "concluida" ? done : inactive;
        const list = map.get(a.closed_entry_id) ?? [];
        list.push(a);
        map.set(a.closed_entry_id, list);
      }
    });

    (todayEntries as any[]).forEach((e) => {
      const D = e.entry_date;
      const arr = allActivities.filter((a) => {
        if (a.user_id !== e.user_id) return false;
        if (a.status !== "pendente") return false;
        const origin = a.created_entry_id ? entryById.get(a.created_entry_id) : null;
        const originDate = origin?.entry_date ?? (a.created_at ? a.created_at.slice(0, 10) : null);
        if (!originDate || originDate > D) return false;
        if (a.closed_entry_id) {
          const closed = entryById.get(a.closed_entry_id);
          if (closed && closed.entry_date <= D) return false;
        }
        return true;
      });
      if (arr.length > 0) planned.set(e.id, arr);

      // "stillPending" = pendências vindas de dias ANTERIORES a D que
      // continuavam abertas no dia D (mesma regra de buildYesterdayTodayLists).
      const carry = allActivities.filter((a) => {
        if (a.user_id !== e.user_id) return false;
        if (a.closed_entry_id === e.id) return false;
        const origin = a.created_entry_id ? entryById.get(a.created_entry_id) : null;
        const originDate = origin?.entry_date ?? (a.created_at ? a.created_at.slice(0, 10) : null);
        if (!originDate) return false;
        if (originDate >= D) return false;
        if (a.closed_entry_id) {
          const closed = entryById.get(a.closed_entry_id);
          if (closed && closed.entry_date <= D) return false;
        }
        return true;
      });
      if (carry.length > 0) stillPending.set(e.id, carry);
    });

    return { done, inactive, planned, stillPending };
  }, [allActivities, todayEntries, prevEntries]);

  const actsFor = (entryId: string) => ({
    done: activitiesByEntry.done.get(entryId) ?? [],
    inactive: activitiesByEntry.inactive.get(entryId) ?? [],
    planned: activitiesByEntry.planned.get(entryId) ?? [],
    stillPending: activitiesByEntry.stillPending.get(entryId) ?? [],
  });

  const tagsByEntry = useMemo(() => {
    const m = new Map<string, ManualTag[]>();
    manualTags.forEach((t) => m.set(t.entry_id, t.tags as ManualTag[]));
    return m;
  }, [manualTags]);

  const entryLabel = (e: any, withDate = true) => {
    const dev = nameByUser.get(e.user_id) ?? "Dev";
    const sq = e.squad_id ? squadById.get(e.squad_id)?.name ?? "Squad" : "Sem squad";
    const base = `${dev} · ${sq}`;
    return withDate ? `${fmtShort(e.entry_date)} — ${base}` : base;
  };

  const impsByEntry = useMemo(() => {
    const m = new Map<string, any[]>();
    (impediments as any[]).forEach((imp) => {
      const arr = m.get(imp.entry_id) ?? [];
      arr.push(imp);
      m.set(imp.entry_id, arr);
    });
    return m;
  }, [impediments]);

  // Estado local: seleção manual de "Melhor Squad" com motivo.
  const [melhorSquadPicks, setMelhorSquadPicks] = useState<
    Array<{ id: string; squadId: string; reason: string }>
  >([]);
  const [msSquadId, setMsSquadId] = useState<string>("");
  const [msReason, setMsReason] = useState<string>("");
  const addMelhorSquad = () => {
    if (!msSquadId) {
      toast.error("Selecione uma squad");
      return;
    }
    setMelhorSquadPicks((prev) => [
      ...prev,
      { id: `ms-${msSquadId}-${Date.now()}`, squadId: msSquadId, reason: msReason.trim() },
    ]);
    setMsSquadId("");
    setMsReason("");
  };
  const removeMelhorSquad = (id: string) =>
    setMelhorSquadPicks((prev) => prev.filter((p) => p.id !== id));

  // ============ Construção das seções ============
  const sections: ReportSection[] = useMemo(() => {
    const bomExemplo: ReportItem[] = [];
    const melhorSquad: ReportItem[] = [];
    const preenchIncorreto: ReportItem[] = [];
    const aguardando: ReportItem[] = [];
    const repetidas: ReportItem[] = [];

    // Índice: (user_id + entry_date) -> entry
    const prevByUserDate = new Map<string, any>();
    (prevEntries as any[]).forEach((p) =>
      prevByUserDate.set(`${p.user_id}|${p.entry_date}`, p),
    );

    (todayEntries as any[]).forEach((e) => {
      const tags = tagsByEntry.get(e.id) ?? [];
      const label = entryLabel(e);
      const dev = nameByUser.get(e.user_id) ?? "Dev";
      const sqName = e.squad_id ? squadById.get(e.squad_id)?.name ?? "Squad" : "Sem squad";
      const entryImps = impsByEntry.get(e.id) ?? [];
      const isManualBom = tags.includes("bom_exemplo");
      if (isManualBom) {
        bomExemplo.push({
          id: `be-${e.id}`,
          text: `${label} — bom exemplo de preenchimento.`,
          origin: "manual",
          date: e.entry_date,
          subject: dev,
          squadName: sqName,
          entry: e,
          impediments: entryImps,
        });
      }

      // Preenchimento incorreto (dedup: auto + manual = 1 item)
      const shortReasons: string[] = [];
      if (isShortText(e.did_yesterday)) shortReasons.push('campo "Ontem" curto');
      if (isShortText(e.will_do_today)) shortReasons.push('campo "Hoje" curto');
      const isManualIncorrect = tags.includes("preenchimento_incorreto");
      if (shortReasons.length > 0 || isManualIncorrect) {
        const parts: string[] = [];
        if (shortReasons.length > 0) parts.push(shortReasons.join(" e "));
        if (isManualIncorrect) parts.push("marcado pelo Admin");
        const origin: ReportItem["origin"] =
          shortReasons.length > 0 && isManualIncorrect ? "both" : isManualIncorrect ? "manual" : "auto";
        preenchIncorreto.push({
          id: `pi-${e.id}`,
          text: `${label} — ${parts.join("; ")}.`,
          origin,
          date: e.entry_date,
          subject: dev,
          squadName: sqName,
          entry: e,
          impediments: entryImps,
        });
      }

      // Aguardando (dedup)
      const isAwaiting = isAwaitingTask(e.will_do_today);
      const isManualAwait = tags.includes("aguardando_tarefa");
      if (isAwaiting || isManualAwait) {
        const trecho = (e.will_do_today ?? "").trim().slice(0, 120);
        const originParts: string[] = [];
        if (isAwaiting) originParts.push("texto contém indicação de aguardo");
        if (isManualAwait) originParts.push("marcado pelo Admin");
        const origin: ReportItem["origin"] =
          isAwaiting && isManualAwait ? "both" : isManualAwait ? "manual" : "auto";
        aguardando.push({
          id: `aw-${e.id}`,
          text: `${label} — ${originParts.join(" · ")}${trecho ? ` ("${trecho}${trecho.length >= 120 ? "…" : ""}")` : ""}.`,
          origin,
          date: e.entry_date,
          subject: dev,
          squadName: sqName,
          entry: e,
          impediments: entryImps,
        });
      }

      // Tarefas repetidas ou estagnadas — critérios EXATOS:
      //  A) Mesmo colaborador escreveu a mesma tarefa em "Ontem" e "Hoje"
      //     do MESMO dia (texto normalizado idêntico).
      //  B) Mesmo colaborador manteve a mesma tarefa em "Hoje" por 3 dias
      //     úteis consecutivos (D, D-1, D-2).
      const prev1Iso = prevBusinessDay(e.entry_date);
      const prev2Iso = prevBusinessDay(prev1Iso);
      const prev1 = prevByUserDate.get(`${e.user_id}|${prev1Iso}`);
      const prev2 = prevByUserDate.get(`${e.user_id}|${prev2Iso}`);

      const sameDayRepeat =
        !!e.did_yesterday &&
        !!e.will_do_today &&
        isExactSameTask(e.did_yesterday, e.will_do_today);

      const threeDayStreak =
        !!e.will_do_today &&
        !!prev1?.will_do_today &&
        !!prev2?.will_do_today &&
        isExactSameTask(e.will_do_today, prev1.will_do_today) &&
        isExactSameTask(e.will_do_today, prev2.will_do_today);

      const isAutoRepeat = sameDayRepeat || threeDayStreak;
      const isManualRepeat = tags.includes("tarefas_repetidas");
      if (isAutoRepeat || isManualRepeat) {
        const originParts: string[] = [];
        if (sameDayRepeat) originParts.push('mesma tarefa em "Ontem" e "Hoje" do mesmo dia');
        if (threeDayStreak) originParts.push(`mesma tarefa há 3 dias úteis (${fmtShort(prev2.entry_date)}, ${fmtShort(prev1.entry_date)}, ${fmtShort(e.entry_date)})`);
        if (isManualRepeat) originParts.push("marcado pelo Admin");
        const origin: ReportItem["origin"] =
          isAutoRepeat && isManualRepeat ? "both" : isManualRepeat ? "manual" : "auto";
        const extra: string[] = [];
        if (sameDayRepeat) {
          extra.push(`Tarefa: ${e.will_do_today}`);
        }
        if (threeDayStreak) {
          extra.push(`${fmtShort(prev2.entry_date)}: ${prev2.will_do_today}`);
          extra.push(`${fmtShort(prev1.entry_date)}: ${prev1.will_do_today}`);
          extra.push(`${fmtShort(e.entry_date)}: ${e.will_do_today}`);
        }
        const repeatDetails: ReportItem["repeatDetails"] = {};
        if (sameDayRepeat) {
          repeatDetails.sameDay = { date: e.entry_date, task: e.will_do_today! };
        }
        if (threeDayStreak) {
          repeatDetails.streak = [
            { date: prev2!.entry_date, task: prev2!.will_do_today! },
            { date: prev1!.entry_date, task: prev1!.will_do_today! },
            { date: e.entry_date, task: e.will_do_today! },
          ];
        }
        repetidas.push({
          id: `rp-${e.id}`,
          text: `${label} — ${originParts.join(" · ")}.`,
          origin,
          date: e.entry_date,
          subject: dev,
          squadName: sqName,
          entry: e,
          impediments: entryImps,
          extraDetails: extra.length ? extra.join("\n") : undefined,
          repeatDetails: Object.keys(repeatDetails).length ? repeatDetails : undefined,
        });
      }
    });

    // Melhor Squad — seleção manual do Admin (squad + motivo)
    melhorSquadPicks.forEach((p) => {
      const sq = squadById.get(p.squadId);
      const name = sq?.name ?? "Squad";
      const motivo = p.reason ? ` — ${p.reason}` : "";
      melhorSquad.push({
        id: p.id,
        text: `${name} — destaque como melhor squad${motivo}.`,
        origin: "manual",
        date: effectiveTo,
        subject: name,
        squadName: name,
        extraDetails: p.reason ? `Motivo: ${p.reason}` : undefined,
      });
    });

    // Faltas — dentro do intervalo, considerando ausências cadastradas e não presenças.
    const faltasItems: ReportItem[] = [];
    (absences as any[]).forEach((a) => {
      const nm = nameByUser.get(a.user_id) ?? "Dev";
      const tipo = DEV_ABSENCE_LABELS[a.absence_type as DevAbsenceType] ?? a.absence_type;
      const periodo =
        a.start_date === a.end_date
          ? format(parseISO(a.start_date), "dd/MM", { locale: ptBR })
          : `${format(parseISO(a.start_date), "dd/MM", { locale: ptBR })} a ${format(parseISO(a.end_date), "dd/MM", { locale: ptBR })}`;
      const motivo = a.notes ? ` — motivo: ${a.notes}` : "";
      faltasItems.push({
        id: `ab-${a.id}`,
        text: `${nm} — ${tipo} (${periodo})${motivo}.`,
        origin: "auto",
        date: a.start_date,
        subject: nm,
        extraDetails: `${tipo} — ${periodo}${a.notes ? `\nMotivo: ${a.notes}` : ""}`,
      });
    });
    // Faltas por não presença em reunião (attendance com absent_from_work ou did_not_participate).
    const meetingById = new Map<string, any>();
    (meetings as any[]).forEach((m) => meetingById.set(m.id, m));
    (attendance as any[]).forEach((a) => {
      const meeting = meetingById.get(a.meeting_id);
      if (!meeting) return;
      const absent = a.absent_from_work === true;
      const didNot = a.did_not_participate === true;
      if (!absent && !didNot) return;
      const nm =
        a.member_name ||
        (a.member_user_id ? nameByUser.get(a.member_user_id) : null) ||
        "Dev";
      const sqName = meeting.squad_id ? squadById.get(meeting.squad_id)?.name ?? "Squad" : "—";
      const tipoLabel = absent ? "Ausente do trabalho" : "Não participou da daily";
      const reason = (a.non_participation_reason || a.notes || "").trim();
      const motivo = reason ? ` — motivo: ${reason}` : " — sem motivo informado";
      faltasItems.push({
        id: `att-${a.id}`,
        text: `${fmtShort(meeting.meeting_date)} — ${nm} · ${sqName} — ${tipoLabel}${motivo}.`,
        origin: "auto",
        date: meeting.meeting_date,
        subject: nm,
        squadName: sqName,
        extraDetails: `${tipoLabel}${reason ? `\nMotivo: ${reason}` : "\nSem motivo informado."}`,
      });
    });

    // Sem pré-daily no prazo
    // Chave: squad_id + meeting_date -> meeting
    const meetingByKey = new Map<string, any>();
    (meetings as any[]).forEach((m) => meetingByKey.set(`${m.squad_id}|${m.meeting_date}`, m));
    const entryByUserSquadDate = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => {
      entryByUserSquadDate.set(`${e.user_id}|${e.squad_id ?? "null"}|${e.entry_date}`, e);
    });
    const semPreDaily: ReportItem[] = [];
    (meetings as any[]).forEach((meeting) => {
      const startedAt = meeting.started_at ?? meeting.created_at;
      const finishedAt = meeting.finished_at ?? null;
      const mdate = meeting.meeting_date;
      const sqName = squadById.get(meeting.squad_id)?.name ?? "Squad";
      const seen = new Set<string>();
      (squadMembers as any[])
        .filter((m) => m.squad_id === meeting.squad_id && m.user_id)
        .forEach((m) => {
          if (seen.has(m.user_id)) return;
          seen.add(m.user_id);
          const entry = entryByUserSquadDate.get(`${m.user_id}|${m.squad_id}|${mdate}`);
          if (!entry) {
            semPreDaily.push({
              id: `sp-${m.user_id}-${m.squad_id}-${mdate}`,
              text: `${fmtShort(mdate)} — ${m.name} · ${sqName} — não enviou o registro até o encerramento da daily.`,
              origin: "auto",
              date: mdate,
              subject: m.name,
              squadName: sqName,
              extraDetails: "Não enviou o registro até o encerramento da daily.",
            });
            return;
          }
          const fill = entry.fill_completed_at ?? entry.created_at;
          if (fill && startedAt && new Date(fill) > new Date(startedAt)) {
            const atrasoMin = Math.round((new Date(fill).getTime() - new Date(startedAt).getTime()) / 60000);
            semPreDaily.push({
              id: `sp-${m.user_id}-${m.squad_id}-${mdate}`,
              text: `${fmtShort(mdate)} — ${m.name} · ${sqName} — enviou ${atrasoMin} min após o início da daily.`,
              origin: "auto",
              date: mdate,
              subject: m.name,
              squadName: sqName,
              entry,
              impediments: impsByEntry.get(entry.id) ?? [],
              extraDetails: `Enviou ${atrasoMin} min após o início da daily.`,
            });
          } else if (!fill && finishedAt) {
            semPreDaily.push({
              id: `sp-${m.user_id}-${m.squad_id}-${mdate}`,
              text: `${fmtShort(mdate)} — ${m.name} · ${sqName} — não enviou até o encerramento da daily.`,
              origin: "auto",
              date: mdate,
              subject: m.name,
              squadName: sqName,
              extraDetails: "Não enviou até o encerramento da daily.",
            });
          }
        });
    });

    // Impedimentos: abertos no intervalo, ainda em aberto, ou sanados no intervalo.
    const entryById = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => entryById.set(e.id, e));
    (impEntries as any[]).forEach((e) => {
      if (!entryById.has(e.id)) entryById.set(e.id, e);
    });
    const impItems: ReportItem[] = (rangeImpediments as any[]).map((imp) => {
      const e = entryById.get(imp.entry_id);
      const openedAt = imp.created_at
        ? format(parseISO(imp.created_at), "dd/MM HH:mm", { locale: ptBR })
        : "";
      const dev = e ? (nameByUser.get(e.user_id) ?? "Dev") : "—";
      const sqName = e?.squad_id ? squadById.get(e.squad_id)?.name ?? "Squad" : undefined;
      const label = e ? entryLabel(e) : `${openedAt} — ${dev}`;
      let statusLabel: string;
      if (imp.resolved) {
        statusLabel = `sanado${imp.resolved_at ? ` em ${format(parseISO(imp.resolved_at), "dd/MM HH:mm", { locale: ptBR })}` : ""}`;
      } else {
        statusLabel = `em aberto há ${formatOpenFor(imp.created_at)}`;
      }
      return {
        id: `imp-${imp.id}`,
        text: `${label} — [${URGENCY_LABELS[imp.urgency]}] ${imp.description} (${statusLabel}).`,
        origin: "auto",
        date: e?.entry_date ?? (imp.created_at ? imp.created_at.slice(0, 10) : undefined),
        subject: dev,
        squadName: sqName,
        entry: e,
        impediments: [imp],
      };
    });

    // Acompanhamento do tempo — média de fill_duration_seconds por dev,
    // agrupada por squad, ordenada da mais rápida para a mais demorada.
    const acompTempoItems: ReportItem[] = [];
    const bySquadDev = new Map<string, Map<string, { total: number; count: number }>>();
    (todayEntries as any[]).forEach((e) => {
      const dur = Number(e.fill_duration_seconds);
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (!e.squad_id || !e.user_id) return;
      let sMap = bySquadDev.get(e.squad_id);
      if (!sMap) {
        sMap = new Map();
        bySquadDev.set(e.squad_id, sMap);
      }
      const cur = sMap.get(e.user_id) ?? { total: 0, count: 0 };
      cur.total += dur;
      cur.count += 1;
      sMap.set(e.user_id, cur);
    });
    const fmtSecs = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.round(s % 60);
      if (m <= 0) return `${sec}s`;
      return `${m}m ${String(sec).padStart(2, "0")}s`;
    };
    const squadTempoAgg = Array.from(bySquadDev.entries())
      .map(([squadId, devMap]) => {
        const sqName = squadById.get(squadId)?.name ?? "Squad";
        const devs = Array.from(devMap.values());
        const devCount = devs.length;
        const devsSec = devs.reduce((acc, v) => acc + v.total, 0);
        const totalCount = devs.reduce((acc, v) => acc + v.count, 0);
        const avg = totalCount > 0 ? devsSec / totalCount : 0;
        return { squadId, sqName, avg, devCount, devsSec };
      })
      .filter((r) => r.devCount > 0 && r.avg > 0)
      .sort((a, b) => a.avg - b.avg);
    squadTempoAgg.forEach((r, idx) => {
      const pos = idx + 1;
      const meetingForSquad = (meetings as any[]).find(
        (m) => m.squad_id === r.squadId && m.meeting_date === effectiveTo,
      );
      const meetingSec = Number(meetingForSquad?.duration_seconds) || 0;
      const totalSec = meetingSec + r.devsSec;
      const avgSec = r.devCount > 0 ? Math.round(r.devsSec / r.devCount) : null;
      acompTempoItems.push({
        id: `at-${r.squadId}`,
        text: `${pos}º ${r.sqName} — ${fmtShort(effectiveTo)} — média ${fmtSecs(r.avg)} por dev (${r.devCount} ${r.devCount === 1 ? "dev" : "devs"}).`,
        origin: "auto",
        date: effectiveTo,
        subject: r.sqName,
        rank: pos,
        timeStats: {
          meetingSec,
          devsSec: r.devsSec,
          totalSec,
          avgSec,
          devsCount: r.devCount,
        },
      });
    });

    // Squads que não iniciaram daily — para cada squad ativa, conta os dias
    // úteis do intervalo em que NÃO houve reunião com presença registrada
    // NEM tempo de daily preenchido (duration_seconds/started_at/finished_at).
    const attendanceByMeeting = new Map<string, number>();
    (attendance as any[]).forEach((a) => {
      attendanceByMeeting.set(
        a.meeting_id,
        (attendanceByMeeting.get(a.meeting_id) ?? 0) + 1,
      );
    });
    const businessDays: string[] = [];
    {
      const start = parseISO(effectiveFrom);
      const end = parseISO(effectiveTo);
      const cur = new Date(start);
      while (cur <= end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(cur.getDate()).padStart(2, "0");
          businessDays.push(`${y}-${m}-${d}`);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    const meetingBySquadDate = new Map<string, any>();
    (meetings as any[]).forEach((m) => {
      if (m.squad_id) meetingBySquadDate.set(`${m.squad_id}|${m.meeting_date}`, m);
    });
    const squadsSemDailyItems: ReportItem[] = [];
    (squads as any[])
      .filter((s) => s.active)
      .forEach((s) => {
        const missingDays: string[] = [];
        businessDays.forEach((d) => {
          const m = meetingBySquadDate.get(`${s.id}|${d}`);
          const hasAttendance = m ? (attendanceByMeeting.get(m.id) ?? 0) > 0 : false;
          const hasTime = m
            ? Boolean(m.duration_seconds) || (Boolean(m.started_at) && Boolean(m.finished_at))
            : false;
          if (!m || (!hasAttendance && !hasTime)) missingDays.push(d);
        });
        if (missingDays.length === 0) return;
        const list = missingDays.map((d) => fmtShort(d)).join(", ");
        squadsSemDailyItems.push({
          id: `ssd-${s.id}`,
          text: `${s.name} — não iniciou a daily em ${missingDays.length} ${missingDays.length === 1 ? "dia" : "dias"} do período (${list}).`,
          origin: "auto",
          date: missingDays[missingDays.length - 1],
          subject: s.name,
          squadName: s.name,
          extraDetails: `Ocorrências no período: ${missingDays.length}\nDias sem daily: ${list}`,
        });
      });
    squadsSemDailyItems.sort((a, b) => a.subject.localeCompare(b.subject));

    const built: ReportSection[] = [
      { id: "bom_exemplo", title: "Melhor colaborador de cada squad", icon: Award, origin: "Marcações manuais", items: bomExemplo },
      { id: "melhor_squad", title: "Melhor squad", icon: Trophy, origin: "Marcações manuais", items: melhorSquad },
      { id: "preenchimento_incorreto", title: "Preenchimentos incorretos ou vagos", icon: AlertTriangle, origin: "Regra automática + marcações manuais", items: preenchIncorreto },
      { id: "faltas", title: "Faltas no período", icon: CalendarX, origin: "Dados automáticos", items: faltasItems },
      { id: "sem_pre_daily", title: "Sem pré-daily no prazo", icon: Clock, origin: "Dados automáticos", items: semPreDaily },
      { id: "aguardando", title: "Aguardando tarefas", icon: HelpCircle, origin: "Palavras-chave + marcações manuais", items: aguardando },
      { id: "repetidas", title: "Tarefas repetidas ou estagnadas", icon: Repeat, origin: "Regra automática + marcações manuais", items: repetidas },
      { id: "impedimentos", title: "Impedimentos e bloqueios", icon: AlertOctagon, origin: "Dados automáticos", items: impItems },
      { id: "acompanhamento_tempo", title: "Acompanhamento do tempo", icon: Timer, origin: "Dados automáticos", items: acompTempoItems },
      { id: "squads_sem_daily", title: "Squads que não iniciaram daily", icon: CalendarOff, origin: "Dados automáticos", items: squadsSemDailyItems },
    ];
    built.forEach((sec) => {
      sec.items.forEach((it) => {
        if (it.entry?.id) {
          const a = actsFor(it.entry.id);
          it.done = a.done;
          it.inactive = a.inactive;
          it.planned = a.planned;
          it.stillPending = a.stillPending;
        }
      });
    });
    return built;
  }, [todayEntries, prevEntries, tagsByEntry, absences, meetings, attendance, squadMembers, impediments, rangeImpediments, impEntries, impsByEntry, squads, squadById, nameByUser, activitiesByEntry, melhorSquadPicks, effectiveFrom, effectiveTo]);

  // Estado editável por item
  const [state, setState] = useState<Record<string, ItemState>>({});

  useEffect(() => {
    setState((prev) => {
      const next: Record<string, ItemState> = {};
      sections.forEach((s) => {
        s.items.forEach((it) => {
          next[it.id] = prev[it.id] ?? { included: true, text: it.text };
        });
      });
      return next;
    });
  }, [sections]);

  const buildText = () => {
    const lines: string[] = [];
    const period =
      effectiveFrom === effectiveTo
        ? fmtLong(effectiveFrom)
        : `${fmtLong(effectiveFrom)} a ${fmtLong(effectiveTo)}`;
    lines.push(`Relatório Executivo da Daily — ${period}`);
    lines.push("");
    sections.forEach((s) => {
      const items = s.items.filter((it) => state[it.id]?.included);
      if (items.length === 0) return;
      lines.push(`${s.title.toUpperCase()}`);
      items.forEach((it) => {
        lines.push(`  • ${state[it.id]?.text ?? it.text}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      toast.success("Relatório copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar o texto");
    }
  };

  const handlePrint = () => {
    exportSectionsAsVisualPdf({
      periodLabel,
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        items: s.items
          .filter((it) => state[it.id]?.included)
          .map((it) => ({ id: it.id, text: state[it.id]?.text ?? it.text, included: true, data: it })),
      })),
    });
  };

  // Salvar snapshot
  const createMut = useCreateExecutiveReport();
  const handleFinish = async () => {
    const snapshotSections = sections.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items.map((it) => ({
        id: it.id,
        text: state[it.id]?.text ?? it.text,
        included: state[it.id]?.included ?? true,
        // Snapshot completo para re-renderizar o card visual no histórico.
        data: {
          id: it.id,
          text: state[it.id]?.text ?? it.text,
          meta: it.meta,
          origin: it.origin,
          date: it.date,
          subject: it.subject,
          squadName: it.squadName,
          entry: it.entry ?? null,
          impediments: it.impediments ?? [],
          done: it.done ?? [],
          inactive: it.inactive ?? [],
          planned: it.planned ?? [],
          stillPending: it.stillPending ?? [],
          extraDetails: it.extraDetails,
          repeatDetails: it.repeatDetails,
          rank: it.rank,
          timeStats: it.timeStats,
        },
      })),
    }));
    await createMut.mutateAsync({
      period_start: effectiveFrom,
      period_end: effectiveTo,
      title: null,
      content_text: buildText(),
      sections: snapshotSections,
    });
  };

  const periodLabel =
    effectiveFrom === effectiveTo
      ? fmtLong(effectiveFrom)
      : `${fmtLong(effectiveFrom)} a ${fmtLong(effectiveTo)}`;

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Relatório Executivo
        </h1>
        <p className="text-sm text-muted-foreground">
          Consolidação diária das dailys com regras automáticas e marcações manuais.
        </p>
      </div>

      <Tabs defaultValue={savedOnly ? "salvos" : "atual"} className="w-full">
        <TabsList className="rounded-xl">
          {!savedOnly && (
            <TabsTrigger value="atual" className="rounded-lg">Gerar relatório</TabsTrigger>
          )}
          <TabsTrigger value="salvos" className="rounded-lg">Relatórios salvos</TabsTrigger>
        </TabsList>

        {!savedOnly && (
        <TabsContent value="atual" className="mt-4">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <Label className="mb-1.5 block text-xs">Data início</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl w-[170px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Data fim</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl w-[170px]"
                />
              </div>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <Button variant="outline" className="rounded-xl gap-2" onClick={handleCopy}>
                <Copy className="w-4 h-4" /> Copiar Texto
              </Button>
              <Button variant="outline" className="rounded-xl gap-2" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Gerar PDF
              </Button>
              <Button
                className="rounded-xl gap-2"
                onClick={handleFinish}
                disabled={createMut.isPending}
              >
                <Save className="w-4 h-4" />
                {createMut.isPending ? "Salvando..." : "Terminar Relatório"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">Período: {periodLabel}</p>

          {loadingEntries && (
            <p className="text-sm text-muted-foreground">Carregando dados…</p>
          )}

          <div className="flex flex-col gap-4">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <ComposeSectionCard
                  key={s.id}
                  title={s.title}
                  Icon={Icon}
                  origin={s.origin}
                  count={s.items.length}
                >
                    {s.id === "melhor_squad" && (
                      <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                          Marcar melhor squad
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select value={msSquadId} onValueChange={setMsSquadId}>
                            <SelectTrigger className="rounded-lg sm:w-[220px]">
                              <SelectValue placeholder="Selecione a squad" />
                            </SelectTrigger>
                            <SelectContent>
                              {(squads as any[]).map((sq) => (
                                <SelectItem key={sq.id} value={sq.id}>
                                  {sq.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            value={msReason}
                            onChange={(e) => setMsReason(e.target.value)}
                            placeholder="Motivo do destaque (opcional)"
                            className="rounded-lg min-h-[38px] flex-1"
                            rows={1}
                          />
                          <Button onClick={addMelhorSquad} className="rounded-lg gap-1 sm:self-start">
                            <Plus className="w-4 h-4" /> Adicionar
                          </Button>
                        </div>
                        {melhorSquadPicks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {melhorSquadPicks.map((p) => {
                              const sq = squadById.get(p.squadId);
                              return (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className="text-[11px] gap-1 bg-primary/5 text-primary border-primary/20"
                                >
                                  {sq?.name ?? "Squad"}
                                  <button
                                    type="button"
                                    onClick={() => removeMelhorSquad(p.id)}
                                    className="hover:opacity-70"
                                    aria-label="Remover"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {s.items.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhum registro para este tópico.</p>
                    )}
                    {s.items.map((it) => {
                      const st = state[it.id] ?? { included: true, text: it.text };
                      return (
                        s.id === "impedimentos" ? (
                          <ImpedimentReportCard
                            key={it.id}
                            item={it}
                            included={st.included}
                            onIncludeChange={(v) =>
                              setState((p) => ({ ...p, [it.id]: { ...st, included: v } }))
                            }
                          />
                        ) : (
                          <ExecReportItemCard
                            key={it.id}
                            item={it}
                            included={st.included}
                            onIncludeChange={(v) =>
                              setState((p) => ({ ...p, [it.id]: { ...st, included: v } }))
                            }
                          />
                        )
                      );
                    })}
                </ComposeSectionCard>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
              Legenda das marcações manuais
            </p>
            <div className="flex flex-wrap gap-2">
              {MANUAL_TAG_OPTIONS.map((o) => (
                <Badge key={o.value} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  {o.label}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>
        )}

        <TabsContent value="salvos" className="mt-4">
          <SavedReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Salvos
// ============================================================
// Rehidrata os itens de um relatório salvo buscando dados vivos
// (entries, atividades, impedimentos) a partir dos ids codificados
// no próprio id do item (be-<entry>, pi-<entry>, aw-<entry>,
// rp-<entry>, pd-<entry>, imp-<impediment>).
function useHydratedSections(report: ExecutiveReport | null): RenderSection[] {
  const entryIds = useMemo(() => {
    if (!report) return [] as string[];
    const ids = new Set<string>();
    report.sections.forEach((s) => {
      s.items.forEach((it) => {
        if (!it.included) return;
        const m = it.id.match(/^(be|pi|aw|rp|pd)-(.+)$/);
        if (m) ids.add(m[2]);
      });
    });
    return Array.from(ids);
  }, [report]);

  const impIds = useMemo(() => {
    if (!report) return [] as string[];
    const ids = new Set<string>();
    report.sections.forEach((s) => {
      s.items.forEach((it) => {
        if (!it.included) return;
        const m = it.id.match(/^imp-(.+)$/);
        if (m) ids.add(m[1]);
      });
    });
    return Array.from(ids);
  }, [report]);

  const { data: entries = [] } = useQuery({
    queryKey: ["exec_report_hydrate_entries", entryIds.sort().join(",")],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dev_daily_entries")
        .select("*")
        .in("id", entryIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const entryUserIds = useMemo(
    () => Array.from(new Set((entries as any[]).map((entry) => entry.user_id).filter(Boolean))),
    [entries],
  );

  const { data: acts = [] } = useQuery({
    queryKey: ["exec_report_hydrate_acts", [...entryUserIds].sort().join(",")],
    enabled: entryUserIds.length > 0,
    queryFn: async () => {
      // Pagina para evitar o teto padrão de 1000 linhas do PostgREST.
      const PAGE = 1000;
      const all: DevDailyActivity[] = [];
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await (supabase.from("dev_daily_activities") as any)
          .select("*")
          .in("user_id", entryUserIds)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const chunk = (data ?? []) as DevDailyActivity[];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const { data: entryImps = [] } = useQuery({
    queryKey: ["exec_report_hydrate_entry_imps", entryIds.sort().join(",")],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dev_daily_impediments")
        .select("*")
        .in("entry_id", entryIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: standaloneImps = [] } = useQuery({
    queryKey: ["exec_report_hydrate_imps", impIds.sort().join(",")],
    enabled: impIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dev_daily_impediments")
        .select("*")
        .in("id", impIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const impedimentEntryIds = useMemo(
    () => Array.from(new Set((standaloneImps as any[]).map((imp) => imp.entry_id).filter(Boolean))),
    [standaloneImps],
  );

  const { data: impedimentEntries = [] } = useQuery({
    queryKey: ["exec_report_hydrate_imp_entries", [...impedimentEntryIds].sort().join(",")],
    enabled: impedimentEntryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dev_daily_entries")
        .select("*")
        .in("id", impedimentEntryIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();

  return useMemo(() => {
    if (!report) return [];
    const allEntries = [...entries, ...impedimentEntries];
    const entryById = new Map<string, any>(allEntries.map((e) => [e.id, e]));
    const squadById = new Map<string, any>(squads.map((s: any) => [s.id, s]));
    const nameByUser = new Map<string, string>(
      profiles.map((p: any) => {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        return [p.user_id, fullName || p.email || "Dev"];
      }),
    );
    const impById = new Map<string, any>(standaloneImps.map((i) => [i.id, i]));
    const impsByEntry = new Map<string, any[]>();
    entryImps.forEach((i) => {
      const arr = impsByEntry.get(i.entry_id) ?? [];
      arr.push(i);
      impsByEntry.set(i.entry_id, arr);
    });
    const hydrateEntryItem = (raw: any): any => {
      const m = raw.id.match(/^(be|pi|aw|rp|pd)-(.+)$/);
      if (!m) return raw;
      const entry = entryById.get(m[2]);
      if (!entry) return raw;
      const dev = nameByUser.get(entry.user_id) ?? "Dev";
      const sqName = entry.squad_id ? squadById.get(entry.squad_id)?.name : undefined;
      const userActs = (acts as DevDailyActivity[]).filter(
        (a) => a.user_id === entry.user_id && (!entry.squad_id || a.squad_id === entry.squad_id),
      );
      const done = userActs.filter((a) => a.status === "concluida" && a.closed_entry_id === entry.id);
      const inactive = userActs.filter((a) => a.status === "inativa" && a.closed_entry_id === entry.id);
      const planned = userActs.filter(
        (a) => a.status === "pendente" && a.created_at.slice(0, 10) <= entry.entry_date,
      );
      // Carry-over: pendências vindas de dias ANTES de D e que continuavam
      // abertas em D (mesma regra usada em Histórico/IniciarDailyModal).
      const stillPending = userActs.filter((a) => {
        if (a.closed_entry_id === entry.id) return false;
        const origin = a.created_entry_id ? entryById.get(a.created_entry_id) : null;
        const originDate = origin?.entry_date ?? (a.created_at ? a.created_at.slice(0, 10) : null);
        if (!originDate) return false;
        if (originDate >= entry.entry_date) return false;
        if (a.closed_entry_id) {
          const closed = entryById.get(a.closed_entry_id);
          if (closed && closed.entry_date <= entry.entry_date) return false;
        }
        return true;
      });
      const data = {
        ...(raw.data ?? {}),
        subject: dev,
        squadName: sqName ?? raw.data?.squadName,
        date: entry.entry_date ?? raw.data?.date,
        origin: raw.data?.origin ?? (m[1] === "be" ? "manual" : "auto"),
        entry,
        impediments: raw.data?.impediments ?? (impsByEntry.get(entry.id) ?? []),
        done: raw.data?.done?.length ? raw.data.done : done,
        inactive: raw.data?.inactive?.length ? raw.data.inactive : inactive,
        planned: raw.data?.planned?.length ? raw.data.planned : planned,
        stillPending: raw.data?.stillPending?.length ? raw.data.stillPending : stillPending,
      };
      return { ...raw, data };
    };

    const hydrateImpItem = (raw: any): any => {
      const m = raw.id.match(/^imp-(.+)$/);
      if (!m) return raw;
      const imp = impById.get(m[1]);
      if (!imp) return raw;
      const entry = entryById.get(imp.entry_id);
      const dev = entry ? (nameByUser.get(entry.user_id) ?? "Dev") : "—";
      const sqName = entry?.squad_id ? squadById.get(entry.squad_id)?.name : undefined;
      const data = {
        ...(raw.data ?? {}),
        subject: dev,
        squadName: sqName ?? raw.data?.squadName,
        date: entry?.entry_date ?? raw.data?.date ?? imp.created_at?.slice(0, 10),
        origin: raw.data?.origin ?? "auto",
        entry: raw.data?.entry ?? entry,
        impediments: raw.data?.impediments?.length ? raw.data.impediments : [imp],
      };
      return { ...raw, data };
    };

    return report.sections
      .filter((s) => s.items.some((i) => i.included))
      .map((s) => ({
        id: s.id,
        title: s.title,
        items: s.items
          .filter((i) => i.included)
          .map((raw) => (s.id === "impedimentos" ? hydrateImpItem(raw) : hydrateEntryItem(raw))),
      }));
  }, [report, entries, impedimentEntries, acts, entryImps, standaloneImps, squads, profiles]);
}

function SavedReportsPanel() {
  const { data: reports = [], isLoading } = useExecutiveReports();
  const del = useDeleteExecutiveReport();
  const [viewing, setViewing] = useState<ExecutiveReport | null>(null);
  const hydrated = useHydratedSections(viewing);
  const [pdfTarget, setPdfTarget] = useState<ExecutiveReport | null>(null);
  const hydratedForPdf = useHydratedSections(pdfTarget);
  const pdfFiringRef = useRef(false);
  const pdfNodeRef = useRef<HTMLDivElement | null>(null);

  const pdfSections = useMemo(() => {
    const nonEmpty = hydratedForPdf.filter((s) => s.items.length > 0);
    return [...nonEmpty].sort((a, b) => {
      if (a.id === "melhor_squad") return -1;
      if (b.id === "melhor_squad") return 1;
      return 0;
    });
  }, [hydratedForPdf]);

  useEffect(() => {
    if (!pdfTarget) {
      pdfFiringRef.current = false;
      return;
    }
    if (pdfFiringRef.current) return;
    if (pdfSections.length === 0) return;
    const node = pdfNodeRef.current;
    if (!node) return;
    pdfFiringRef.current = true;
    const period2 =
      pdfTarget.period_start === pdfTarget.period_end
        ? fmtLong(pdfTarget.period_start)
        : `${fmtLong(pdfTarget.period_start)} a ${fmtLong(pdfTarget.period_end)}`;
    let cancelled = false;
    (async () => {
      // Aguarda layout/paint da árvore offscreen antes de capturar.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      await new Promise<void>((r) => setTimeout(r, 300));
      if (cancelled) return;
      try {
        await downloadElementAsPdf(
          node,
          `relatorio-executivo-${period2.replace(/\s+/g, "_")}.pdf`,
        );
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível gerar o PDF");
      } finally {
        setPdfTarget(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfTarget, pdfSections]);

  return (
    <div>
      {pdfTarget && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -10000,
            top: 0,
            width: 1100,
            background: "#ffffff",
            padding: 24,
            zIndex: -1,
          }}
        >
          <div ref={pdfNodeRef}>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
                Relatório Executivo da Daily
              </h1>
              <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>
                {(pdfTarget.period_start === pdfTarget.period_end
                  ? fmtLong(pdfTarget.period_start)
                  : `${fmtLong(pdfTarget.period_start)} a ${fmtLong(pdfTarget.period_end)}`)}{" "}
                · Fadami Flow
              </p>
              <div style={{ height: 2, background: "#F97316", marginTop: 12 }} />
            </div>
            <ReportSectionsView sections={pdfSections} interactive={false} forceOpen={true} stacked />
          </div>
        </div>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && reports.length === 0 && (
        <div className="rounded-2xl border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum relatório salvo ainda. Use o botão "Terminar Relatório" na aba anterior para arquivar.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports.map((r) => {
          const period =
            r.period_start === r.period_end
              ? fmtLong(r.period_start)
              : `${fmtLong(r.period_start)} a ${fmtLong(r.period_end)}`;
          const created = (() => {
            try {
              return format(parseISO(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            } catch {
              return r.created_at;
            }
          })();
          const preview = (r.content_text ?? "").slice(0, 200);
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> {period}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Emitido em {created}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {preview || "—"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setViewing(r)}>
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(r.content_text);
                        toast.success("Copiado");
                      } catch {
                        toast.error("Não foi possível copiar");
                      }
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5"
                    disabled={pdfTarget?.id === r.id}
                    onClick={() => setPdfTarget(r)}
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm("Excluir este relatório?")) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Relatório salvo
            </DialogTitle>
            <DialogDescription>
              {viewing && (
                viewing.period_start === viewing.period_end
                  ? fmtLong(viewing.period_start)
                  : `${fmtLong(viewing.period_start)} a ${fmtLong(viewing.period_end)}`
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="px-6 py-4 space-y-4">
              {viewing && (
                <ReportSectionsView
                  sections={(() => {
                    const nonEmpty = hydrated.filter((s) => s.items.length > 0);
                    return [...nonEmpty].sort((a, b) => {
                      if (a.id === "melhor_squad") return -1;
                      if (b.id === "melhor_squad") return 1;
                      return 0;
                    });
                  })()}
                  interactive={false}
                  forceOpen={false}
                  collapsibleSections={true}
                  stacked={true}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setViewing(null)} className="rounded-lg">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Impressão compartilhada
// ============================================================
function printReport(
  periodLabel: string,
  sections: Array<{ title: string; items: string[] }>,
) {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    toast.error("Bloqueio de pop-up impediu a impressão");
    return;
  }
  const sectionsHtml = sections
    .filter((s) => s.items.length > 0)
    .map(
      (s) => `
          <section>
            <h2>${s.title}</h2>
            <ul>
              ${s.items.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
            </ul>
          </section>
        `,
    )
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Executivo — ${periodLabel}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; margin: 32px; }
        header { border-bottom: 2px solid #F97316; padding-bottom: 12px; margin-bottom: 24px; }
        h1 { margin: 0; font-size: 22px; color: #0f172a; }
        header p { margin: 4px 0 0; color: #475569; font-size: 13px; }
        section { break-inside: avoid; margin-bottom: 18px; }
        h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #F97316; border-left: 3px solid #F97316; padding-left: 8px; margin: 0 0 8px; }
        ul { margin: 0; padding-left: 20px; }
        li { font-size: 13px; line-height: 1.5; margin-bottom: 4px; color: #1e293b; }
        footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <header>
        <h1>Relatório Executivo da Daily</h1>
        <p>${periodLabel} · Fadami Flow</p>
      </header>
      ${sectionsHtml || '<p style="color:#64748b">Nenhum item selecionado.</p>'}
      <footer>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</footer>
      </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// Ícones e renderização compartilhada dos cards do relatório
// ============================================================
const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bom_exemplo: Award,
  melhor_squad: Trophy,
  preenchimento_incorreto: AlertTriangle,
  faltas: CalendarX,
  sem_pre_daily: Clock,
  aguardando: HelpCircle,
  repetidas: Repeat,
  impedimentos: AlertOctagon,
  acompanhamento_tempo: Timer,
  squads_sem_daily: CalendarOff,
};

interface RenderSection {
  id: string;
  title: string;
  items: Array<{ id: string; text: string; included: boolean; data?: any }>;
}

function reviveItem(raw: { id: string; text: string; data?: any }): ReportItem {
  const d = raw.data ?? {};
  // Fallback: extrai subject/squad/data do texto "DD/MM — Nome · Squad — …"
  // para relatórios salvos antes do snapshot rico.
  let subject: string = d.subject ?? "";
  let squadName: string | undefined = d.squadName;
  let date: string | undefined = d.date;
  if (!subject || subject === "—") {
    const m = raw.text.match(/^(\d{2}\/\d{2})\s+—\s+([^·—]+?)(?:\s+·\s+([^—]+?))?\s+—/);
    if (m) {
      if (!date) {
        const [dd, mm] = m[1].split("/");
        // Assume ano atual apenas para exibição do badge.
        date = `${new Date().getFullYear()}-${mm}-${dd}`;
      }
      subject = m[2].trim();
      if (!squadName && m[3]) squadName = m[3].trim();
    } else {
      // Padrão "Nome — …" sem data.
      const m2 = raw.text.match(/^([^—]+?)\s+—/);
      if (m2) subject = m2[1].trim();
    }
  }
  return {
    id: raw.id,
    text: raw.text,
    origin: d.origin ?? "auto",
    subject: subject || "—",
    date,
    squadName,
    entry: d.entry ?? undefined,
    impediments: d.impediments ?? [],
    done: d.done ?? [],
    inactive: d.inactive ?? [],
    planned: d.planned ?? [],
    stillPending: d.stillPending ?? [],
    extraDetails: d.extraDetails,
    repeatDetails: d.repeatDetails,
    rank: d.rank,
    timeStats: d.timeStats,
  };
}

function ReportSectionsView({
  sections,
  interactive,
  forceOpen,
  collapsibleSections = false,
  stacked = false,
}: {
  sections: RenderSection[];
  interactive: boolean;
  forceOpen: boolean;
  collapsibleSections?: boolean;
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "flex flex-col gap-4" : "grid grid-cols-1 xl:grid-cols-2 gap-4"}>
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.id] ?? FileText;
        return collapsibleSections ? (
          <CollapsibleSectionCard key={s.id} section={s} Icon={Icon} interactive={interactive} forceOpen={forceOpen} />
        ) : (
          <Card key={s.id} className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                {s.title}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px]">
                  {s.items.length} {s.items.length === 1 ? "item" : "itens"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {s.items.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum registro.</p>
              )}
              {s.items.map((raw) => {
                const it = reviveItem(raw);
                return s.id === "impedimentos" ? (
                  <ImpedimentReportCard
                    key={raw.id}
                    item={it}
                    included={true}
                    interactive={interactive}
                  />
                ) : (
                  <ExecReportItemCard
                    key={raw.id}
                    item={it}
                    included={true}
                    interactive={interactive}
                    forceOpen={forceOpen}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CollapsibleSectionCard({
  section,
  Icon,
  interactive,
  forceOpen,
}: {
  section: RenderSection;
  Icon: React.ComponentType<{ className?: string }>;
  interactive: boolean;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/40 rounded-t-2xl transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-base font-semibold">{section.title}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {section.items.length} {section.items.length === 1 ? "registro" : "registros"}
        </Badge>
      </button>
      {open && (
        <CardContent className="space-y-2 pt-0">
          {section.items.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nenhum registro.</p>
          )}
          {section.items.map((raw) => {
            const it = reviveItem(raw);
            return section.id === "impedimentos" ? (
              <ImpedimentReportCard key={raw.id} item={it} included={true} interactive={interactive} />
            ) : (
              <ExecReportItemCard
                key={raw.id}
                item={it}
                included={true}
                interactive={interactive}
                forceOpen={forceOpen}
              />
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

function ComposeSectionCard({
  title,
  Icon,
  origin,
  count,
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  origin: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-muted/40 rounded-t-2xl transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-base font-semibold truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px] bg-muted/40">
            {origin}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {count} {count === 1 ? "registro" : "registros"}
          </Badge>
        </div>
      </button>
      {open && <CardContent className="space-y-2 pt-0">{children}</CardContent>}
    </Card>
  );
}

// ============================================================
// Exportação em PDF preservando o layout visual (expandido).
// ============================================================
async function exportSectionsAsVisualPdf(input: {
  periodLabel: string;
  sections: RenderSection[];
}) {
  const { periodLabel, sections } = input;
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1100px;background:#ffffff;padding:24px;z-index:-1;";
  document.body.appendChild(container);

  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  const root = createRoot(container);
  const tree = (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
          Relatório Executivo da Daily
        </h1>
        <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>
          {periodLabel} · Fadami Flow
        </p>
        <div style={{ height: 2, background: "#F97316", marginTop: 12 }} />
      </div>
      <ReportSectionsView
        sections={sections}
        interactive={false}
        forceOpen={true}
      />
    </div>
  );
  // flushSync garante que a árvore esteja no DOM antes do html2canvas.
  if (typeof flushSync === "function") {
    flushSync(() => root.render(tree));
  } else {
    root.render(tree);
  }
  // 2x requestAnimationFrame + timeout curto para permitir layout/paint.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise<void>((r) => setTimeout(r, 250));

  try {
    await downloadElementAsPdf(
      container,
      `relatorio-executivo-${periodLabel.replace(/\s+/g, "_")}.pdf`,
    );
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

// ============================================================
// Card colapsável de item do relatório — visual do histórico
// ============================================================
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";

function ExecReportItemCard({
  item,
  included,
  onIncludeChange,
  interactive = true,
  forceOpen = false,
}: {
  item: ReportItem;
  included: boolean;
  onIncludeChange?: (v: boolean) => void;
  interactive?: boolean;
  forceOpen?: boolean;
}) {
  const [openState, setOpen] = useState(false);
  const open = forceOpen || openState;
  const entry = item.entry;
  const imps = item.impediments ?? [];
  const openImps = imps.filter((i) => !i.resolved);
  const resolvedImps = imps.filter((i) => i.resolved);

  const originBadge = (() => {
    if (item.origin === "manual")
      return { label: "Manual", className: "bg-primary/10 text-primary border-primary/30" };
    if (item.origin === "both")
      return { label: "Auto + Manual", className: "bg-violet-500/10 text-violet-600 border-violet-500/30" };
    return { label: "Automático", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
  })();

  const dateStr = item.date ? fmtShort(item.date) : null;
  const isTimeStats = !!item.timeStats;

  return (
    <Card
      className={`rounded-xl overflow-hidden transition-all ${
        included ? "border-border/70" : "border-border/50 bg-muted/30 opacity-70"
      } ${openImps.length > 0 ? "border-l-4 border-l-orange-500" : ""}`}
    >
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="text-muted-foreground shrink-0">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          {isTimeStats && item.rank ? (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
              {item.rank}º
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary">
              {initialsOf(item.subject)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm leading-tight">{item.subject}</span>
              {!isTimeStats && item.squadName && (
                <Badge variant="outline" className="text-[10px] bg-muted/40">
                  {item.squadName}
                </Badge>
              )}
              {!isTimeStats && (
                <Badge variant="outline" className={`text-[10px] gap-1 ${originBadge.className}`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {originBadge.label}
                </Badge>
              )}
              {dateStr && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="w-2.5 h-2.5" /> {dateStr}
                </Badge>
              )}
              {!isTimeStats && openImps.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {openImps.length} {openImps.length > 1 ? "impedimentos" : "impedimento"}
                </Badge>
              )}
            </div>
          </div>
          {interactive && onIncludeChange && (
            <div
              className="flex items-center gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground hidden md:inline">
                Incluir
              </span>
              <Switch checked={included} onCheckedChange={onIncludeChange} />
            </div>
          )}
        </div>

        {open && (
          <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-background/40">
            {isTimeStats && item.timeStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border bg-muted/20 p-2">
                <div className="rounded-md px-2.5 py-1.5 bg-background">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TEMPO TOTAL DA DAILY</p>
                  <p className="text-sm font-semibold flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" /> {formatDuration(item.timeStats.meetingSec) ?? "—"}
                  </p>
                </div>
                <div className="rounded-md px-2.5 py-1.5 bg-background">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TEMPO TOTAL DOS DEVS</p>
                  <p className="text-sm font-semibold flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" /> {formatDuration(item.timeStats.devsSec) ?? "—"}
                  </p>
                </div>
                <div className="rounded-md px-2.5 py-1.5 bg-primary/10">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TEMPO TOTAL DO TIME</p>
                  <p className="text-sm font-semibold flex items-center gap-1 text-primary">
                    <Clock className="h-3 w-3" /> {formatDuration(item.timeStats.totalSec) ?? "—"}
                  </p>
                </div>
                <div className="rounded-md px-2.5 py-1.5 bg-background">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    MÉDIA POR DEV{item.timeStats.devsCount ? ` (${item.timeStats.devsCount})` : ""}
                  </p>
                  <p className="text-sm font-semibold flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" /> {item.timeStats.avgSec != null ? (formatDuration(item.timeStats.avgSec) ?? "—") : "—"}
                  </p>
                </div>
              </div>
            )}

            {!isTimeStats && entry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                    Ontem
                  </p>
                  {(item.done?.length ?? 0) + (item.inactive?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {item.done?.flatMap((a) => {
                        const lines = splitFreeText(a.description || "");
                        const list = lines.length > 0 ? lines : [a.description];
                        return list.map((line, idx) => (
                          <DevActivityCard key={`${a.id}-${idx}`} kind="done" description={line} createdAt={a.created_at} devNotes={a.dev_notes} />
                        ));
                      })}
                      {item.inactive?.flatMap((a) => {
                        const lines = splitFreeText(a.description || "");
                        const list = lines.length > 0 ? lines : [a.description];
                        return list.map((line, idx) => (
                          <DevActivityCard key={`${a.id}-${idx}`} kind="inactive" description={line} createdAt={a.created_at} devNotes={a.dev_notes} />
                        ));
                      })}
                    </div>
                  ) : (
                    <FreeTextActivityList
                      text={entry.did_yesterday}
                      kind="done"
                      emptyFallback={<p className="text-xs text-muted-foreground">—</p>}
                      keyPrefix={`rel-y-${entry.id}`}
                    />
                  )}
                </div>
                <div className="rounded-lg bg-primary/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-1">
                    Hoje
                  </p>
                  {(item.planned?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {item.planned?.flatMap((a) => {
                        const lines = splitFreeText(a.description || "");
                        const list = lines.length > 0 ? lines : [a.description];
                        return list.map((line, idx) => (
                          <DevActivityCard key={`${a.id}-${idx}`} kind="pending" description={line} createdAt={a.created_at} devNotes={a.dev_notes} />
                        ));
                      })}
                    </div>
                  ) : (
                    <FreeTextActivityList
                      text={entry.will_do_today}
                      kind="pending"
                      emptyFallback={<p className="text-xs text-muted-foreground">—</p>}
                      keyPrefix={`rel-t-${entry.id}`}
                    />
                  )}
                </div>
              </div>
            )}

            {entry?.general_notes?.trim() && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                  Observações gerais do dev
                </p>
                <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                  {entry.general_notes}
                </p>
              </div>
            )}

            {openImps.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-600">
                  Impedimentos abertos
                </p>
                {openImps.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                        {imp.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${URGENCY_STYLES[imp.urgency as keyof typeof URGENCY_STYLES]}`}
                        >
                          {URGENCY_LABELS[imp.urgency as keyof typeof URGENCY_LABELS]}
                        </Badge>
                        {imp.created_at && (
                          <span className="text-[10px] text-orange-700/80 dark:text-orange-400/80 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Aberto há {formatOpenFor(imp.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resolvedImps.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-600">
                  Impedimentos sanados
                </p>
                {resolvedImps.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                        {imp.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${URGENCY_STYLES[imp.urgency as keyof typeof URGENCY_STYLES]}`}
                        >
                          {URGENCY_LABELS[imp.urgency as keyof typeof URGENCY_LABELS]}
                        </Badge>
                        {imp.created_at && imp.resolved_at && (
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Aberto por {formatOpenFor(imp.created_at, imp.resolved_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {item.repeatDetails ? (
              <div className="space-y-2">
                {item.repeatDetails.sameDay && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Repeat className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Mesma tarefa em "Ontem" e "Hoje"
                      </span>
                      <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                        <Clock className="w-2.5 h-2.5" />
                        {fmtShort(item.repeatDetails.sameDay.date)}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap leading-snug">
                      {item.repeatDetails.sameDay.task}
                    </p>
                  </div>
                )}
                {item.repeatDetails.streak && item.repeatDetails.streak.length > 0 && (
                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                        Mesma tarefa há {item.repeatDetails.streak.length} dias úteis
                      </span>
                    </div>
                    <ol className="relative border-l-2 border-orange-500/30 pl-4 space-y-2 ml-1">
                      {item.repeatDetails.streak.map((s, idx) => (
                        <li key={idx} className="relative">
                          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-orange-500/80 ring-2 ring-background" />
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-background">
                              {fmtShort(s.date)}
                            </Badge>
                            <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap leading-snug">
                              {s.task}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : item.extraDetails && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                  {item.extraDetails}
                </p>
              </div>
            )}

            {!isTimeStats && !entry && !item.extraDetails && (
              <p className="text-xs text-muted-foreground italic">{item.text}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Card compacto de impedimento — visual estilo "task warning"
// ============================================================
function ImpedimentReportCard({
  item,
  included,
  onIncludeChange,
  interactive = true,
}: {
  item: ReportItem;
  included: boolean;
  onIncludeChange?: (v: boolean) => void;
  interactive?: boolean;
}) {
  const imp = item.impediments?.[0];
  if (!imp) return null;

  const dev = item.subject;
  const squad = item.squadName;
  const urgency = imp.urgency as keyof typeof URGENCY_LABELS;
  const createdFmt = imp.created_at
    ? format(parseISO(imp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;
  const resolvedFmt = imp.resolved_at
    ? format(parseISO(imp.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;
  const openFor = imp.resolved
    ? (imp.created_at && imp.resolved_at
        ? formatOpenFor(imp.created_at, imp.resolved_at)
        : null)
    : (imp.created_at ? formatOpenFor(imp.created_at) : null);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        included
          ? imp.resolved
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-orange-500/5 border-orange-500/30"
          : "bg-muted/30 border-border/50 opacity-70"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {imp.resolved ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug whitespace-pre-wrap break-words text-foreground">
            {imp.description}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/90">{dev}</span>
            {squad && (
              <>
                <span aria-hidden>•</span>
                <Badge variant="outline" className="text-[10px] bg-muted/40">
                  {squad}
                </Badge>
              </>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] ${URGENCY_STYLES[urgency]}`}
            >
              {URGENCY_LABELS[urgency]}
            </Badge>
            {createdFmt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Aberto em {createdFmt}
              </span>
            )}
            {resolvedFmt && (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Sanado em {resolvedFmt}
              </span>
            )}
            {openFor && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  imp.resolved
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400"
                }`}
              >
                {imp.resolved ? `Ficou aberto por ${openFor}` : `Aberto há ${openFor}`}
              </Badge>
            )}
          </div>
        </div>
        {interactive && onIncludeChange && (
          <div
            className="flex items-center gap-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground hidden md:inline">
              Incluir
            </span>
            <Switch checked={included} onCheckedChange={onIncludeChange} />
          </div>
        )}
      </div>
    </div>
  );
}