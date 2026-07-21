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
import { formatOpenFor } from "@/lib/formatDuration";
import { downloadElementAsPdf } from "@/lib/visualPdf";
import { useDailyEntryTagsByEntries } from "@/hooks/useDailyEntryTags";
import { DEV_ABSENCE_LABELS, type DevAbsenceType } from "@/hooks/useDevAbsences";
import {
  useDevDailyActivitiesByUsers,
  type DevDailyActivity,
} from "@/hooks/useDevDailyActivities";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import {
  isAwaitingTask,
  isRepeatedFromPrev,
  isShortText,
  MANUAL_TAG_OPTIONS,
  type ManualTag,
} from "@/lib/executiveReportRules";
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
  | "impedimentos";

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
  extraDetails?: string;
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

export default function RelatorioExecutivoPage() {
  const [dateFrom, setDateFrom] = useState<string>(todayISO());
  const [dateTo, setDateTo] = useState<string>(todayISO());
  const effectiveFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const effectiveTo = dateFrom <= dateTo ? dateTo : dateFrom;
  // Faixa alargada para buscar entries do dia útil anterior a cada data do intervalo.
  const prevRangeFrom = useMemo(
    () => prevBusinessDay(effectiveFrom),
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
        .select("id,user_id,squad_id,entry_date,did_yesterday,will_do_today,impediments,general_notes,fill_completed_at,created_at")
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
        .select("id,squad_id,meeting_date,started_at,finished_at,created_at")
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
    const entryById = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => entryById.set(e.id, e));

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
    });

    return { done, inactive, planned };
  }, [allActivities, todayEntries]);

  const actsFor = (entryId: string) => ({
    done: activitiesByEntry.done.get(entryId) ?? [],
    inactive: activitiesByEntry.inactive.get(entryId) ?? [],
    planned: activitiesByEntry.planned.get(entryId) ?? [],
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

      // Tarefas repetidas (dedup: auto + manual = 1 item)
      const prevIso = prevBusinessDay(e.entry_date);
      const prev = prevByUserDate.get(`${e.user_id}|${prevIso}`);
      const isAutoRepeat =
        !!prev?.will_do_today &&
        !!e.will_do_today &&
        isRepeatedFromPrev(e.will_do_today, prev.will_do_today);
      const isManualRepeat = tags.includes("tarefas_repetidas");
      if (isAutoRepeat || isManualRepeat) {
        const originParts: string[] = [];
        if (isAutoRepeat) originParts.push(`repetiu tarefa do dia anterior (${fmtShort(prev.entry_date)})`);
        if (isManualRepeat) originParts.push("marcado pelo Admin");
        const origin: ReportItem["origin"] =
          isAutoRepeat && isManualRepeat ? "both" : isManualRepeat ? "manual" : "auto";
        repetidas.push({
          id: `rp-${e.id}`,
          text: `${label} — ${originParts.join(" · ")}.`,
          origin,
          date: e.entry_date,
          subject: dev,
          squadName: sqName,
          entry: e,
          impediments: entryImps,
          extraDetails: isAutoRepeat && prev?.will_do_today
            ? `Dia anterior (${fmtShort(prev.entry_date)}): ${prev.will_do_today}`
            : undefined,
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

    const built: ReportSection[] = [
      { id: "bom_exemplo", title: "Bom exemplo por squad", icon: Award, origin: "Marcações manuais", items: bomExemplo },
      { id: "melhor_squad", title: "Melhor squad", icon: Trophy, origin: "Marcações manuais", items: melhorSquad },
      { id: "preenchimento_incorreto", title: "Preenchimentos incorretos ou vagos", icon: AlertTriangle, origin: "Regra automática + marcações manuais", items: preenchIncorreto },
      { id: "faltas", title: "Faltas no período", icon: CalendarX, origin: "Dados automáticos", items: faltasItems },
      { id: "sem_pre_daily", title: "Sem pré-daily no prazo", icon: Clock, origin: "Dados automáticos", items: semPreDaily },
      { id: "aguardando", title: "Aguardando tarefas", icon: HelpCircle, origin: "Palavras-chave + marcações manuais", items: aguardando },
      { id: "repetidas", title: "Tarefas repetidas ou estagnadas", icon: Repeat, origin: "Regra automática + marcações manuais", items: repetidas },
      { id: "impedimentos", title: "Impedimentos e bloqueios", icon: AlertOctagon, origin: "Dados automáticos", items: impItems },
    ];
    built.forEach((sec) => {
      sec.items.forEach((it) => {
        if (it.entry?.id) {
          const a = actsFor(it.entry.id);
          it.done = a.done;
          it.inactive = a.inactive;
          it.planned = a.planned;
        }
      });
    });
    return built;
  }, [todayEntries, prevEntries, tagsByEntry, absences, meetings, attendance, squadMembers, impediments, rangeImpediments, impEntries, impsByEntry, squadById, nameByUser, activitiesByEntry, melhorSquadPicks, effectiveTo]);

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
          extraDetails: it.extraDetails,
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

      <Tabs defaultValue="atual" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="atual" className="rounded-lg">Gerar relatório</TabsTrigger>
          <TabsTrigger value="salvos" className="rounded-lg">Relatórios salvos</TabsTrigger>
        </TabsList>

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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.id} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      {s.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] bg-muted/40">
                        {s.origin}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.items.length} {s.items.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                  </CardContent>
                </Card>
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

  const { data: acts = [] } = useQuery({
    queryKey: ["exec_report_hydrate_acts", entryIds.sort().join(",")],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_activities") as any)
        .select("*")
        .in("linked_entry_id", entryIds);
      if (error) throw error;
      return (data ?? []) as DevDailyActivity[];
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

  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();

  return useMemo(() => {
    if (!report) return [];
    const entryById = new Map<string, any>(entries.map((e) => [e.id, e]));
    const squadById = new Map<string, any>(squads.map((s: any) => [s.id, s]));
    const nameByUser = new Map<string, string>(
      profiles.map((p: any) => [p.user_id, p.name ?? p.email ?? "Dev"]),
    );
    const impById = new Map<string, any>(standaloneImps.map((i) => [i.id, i]));
    const impsByEntry = new Map<string, any[]>();
    entryImps.forEach((i) => {
      const arr = impsByEntry.get(i.entry_id) ?? [];
      arr.push(i);
      impsByEntry.set(i.entry_id, arr);
    });
    const actsByEntry = new Map<string, DevDailyActivity[]>();
    (acts as DevDailyActivity[]).forEach((a) => {
      const key = (a as any).linked_entry_id as string | undefined;
      if (!key) return;
      const arr = actsByEntry.get(key) ?? [];
      arr.push(a);
      actsByEntry.set(key, arr);
    });

    const hydrateEntryItem = (raw: any): any => {
      const m = raw.id.match(/^(be|pi|aw|rp|pd)-(.+)$/);
      if (!m) return raw;
      const entry = entryById.get(m[2]);
      if (!entry) return raw;
      const dev = nameByUser.get(entry.user_id) ?? "Dev";
      const sqName = entry.squad_id ? squadById.get(entry.squad_id)?.name : undefined;
      const entryActs = actsByEntry.get(entry.id) ?? [];
      const done = entryActs.filter((a: any) => a.status === "concluida");
      const inactive = entryActs.filter((a: any) => a.status === "inativa" || a.status === "cancelada");
      const planned = entryActs.filter((a: any) => a.status === "pendente" || a.status === "em_andamento" || a.status === "planejada");
      const data = {
        ...(raw.data ?? {}),
        subject: raw.data?.subject ?? dev,
        squadName: raw.data?.squadName ?? sqName,
        date: raw.data?.date ?? entry.entry_date,
        origin: raw.data?.origin ?? (m[1] === "be" ? "manual" : "auto"),
        entry,
        impediments: raw.data?.impediments ?? (impsByEntry.get(entry.id) ?? []),
        done: raw.data?.done ?? done,
        inactive: raw.data?.inactive ?? inactive,
        planned: raw.data?.planned ?? planned,
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
        subject: raw.data?.subject ?? dev,
        squadName: raw.data?.squadName ?? sqName,
        date: raw.data?.date ?? entry?.entry_date ?? imp.created_at?.slice(0, 10),
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
  }, [report, entries, acts, entryImps, standaloneImps, squads, profiles]);
}

function SavedReportsPanel() {
  const { data: reports = [], isLoading } = useExecutiveReports();
  const del = useDeleteExecutiveReport();
  const [viewing, setViewing] = useState<ExecutiveReport | null>(null);
  const hydrated = useHydratedSections(viewing);

  return (
    <div>
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
                    onClick={() => {
                      const period2 =
                        r.period_start === r.period_end
                          ? fmtLong(r.period_start)
                          : `${fmtLong(r.period_start)} a ${fmtLong(r.period_end)}`;
                      exportSectionsAsVisualPdf({
                        periodLabel: period2,
                        sections: r.sections.map((s) => ({
                          id: s.id,
                          title: s.title,
                          items: s.items.filter((i) => i.included),
                        })),
                      });
                    }}
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
                  sections={hydrated.filter((s) => s.items.length > 0)}
                  interactive={false}
                  forceOpen={false}
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
    extraDetails: d.extraDetails,
  };
}

function ReportSectionsView({
  sections,
  interactive,
  forceOpen,
}: {
  sections: RenderSection[];
  interactive: boolean;
  forceOpen: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.id] ?? FileText;
        return (
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary">
            {initialsOf(item.subject)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm leading-tight">{item.subject}</span>
              {item.squadName && (
                <Badge variant="outline" className="text-[10px] bg-muted/40">
                  {item.squadName}
                </Badge>
              )}
              <Badge variant="outline" className={`text-[10px] gap-1 ${originBadge.className}`}>
                <Sparkles className="w-2.5 h-2.5" />
                {originBadge.label}
              </Badge>
              {dateStr && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="w-2.5 h-2.5" /> {dateStr}
                </Badge>
              )}
              {openImps.length > 0 && (
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
            {entry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                    Ontem
                  </p>
                  {(item.done?.length ?? 0) + (item.inactive?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {item.done?.map((a) => (
                        <DevActivityCard key={a.id} kind="done" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                      ))}
                      {item.inactive?.map((a) => (
                        <DevActivityCard key={a.id} kind="inactive" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                      {entry.did_yesterday || "—"}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-primary/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-primary/80 mb-1">
                    Hoje
                  </p>
                  {(item.planned?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {item.planned?.map((a) => (
                        <DevActivityCard key={a.id} kind="pending" description={a.description} createdAt={a.created_at} devNotes={a.dev_notes} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                      {entry.will_do_today || "—"}
                    </p>
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

            {item.extraDetails && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                  {item.extraDetails}
                </p>
              </div>
            )}

            {!entry && !item.extraDetails && (
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