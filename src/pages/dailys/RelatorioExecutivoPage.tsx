import { useEffect, useMemo, useState } from "react";
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
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS } from "@/hooks/useDevDailyImpediments";
import { URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { formatOpenFor } from "@/lib/formatDuration";
import { useDailyEntryTagsByEntries } from "@/hooks/useDailyEntryTags";
import { DEV_ABSENCE_LABELS, type DevAbsenceType } from "@/hooks/useDevAbsences";
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
  const sevenDaysAgo = useMemo(() => {
    const d = subDays(parseISO(effectiveTo), 6);
    return format(d, "yyyy-MM-dd");
  }, [effectiveTo]);
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

  // Ausências ativas cobrindo os últimos 7 dias.
  const { data: absences = [] } = useQuery({
    queryKey: ["exec-report", "absences", effectiveTo, sevenDaysAgo],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_absences") as any)
        .select("*")
        .eq("active", true)
        .lte("start_date", effectiveTo)
        .gte("end_date", sevenDaysAgo);
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
  const { data: impediments = [] } = useDevDailyImpedimentsByEntries(entryIds);
  const { data: manualTags = [] } = useDailyEntryTagsByEntries(entryIds);

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

    const squadMelhorTagged = new Map<string, Set<string>>(); // squad_id -> dates

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
      if (tags.includes("melhor_squad") && e.squad_id) {
        if (!squadMelhorTagged.has(e.squad_id)) squadMelhorTagged.set(e.squad_id, new Set());
        squadMelhorTagged.get(e.squad_id)!.add(e.entry_date);
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

    squadMelhorTagged.forEach((dates, sid) => {
      const sq = squadById.get(sid);
      const dateList = Array.from(dates).sort().map(fmtShort).join(", ");
      const sortedDates = Array.from(dates).sort();
      melhorSquad.push({
        id: `ms-${sid}`,
        text: `${sq?.name ?? "Squad"} — destaque como melhor squad (${dateList}).`,
        origin: "manual",
        date: sortedDates[sortedDates.length - 1],
        subject: sq?.name ?? "Squad",
        squadName: sq?.name,
        extraDetails: `Dias marcados: ${dateList}`,
      });
    });

    // Faltas (últimos 7 dias)
    const faltasItems: ReportItem[] = (absences as any[]).map((a) => {
      const nm = nameByUser.get(a.user_id) ?? "Dev";
      const tipo = DEV_ABSENCE_LABELS[a.absence_type as DevAbsenceType] ?? a.absence_type;
      const periodo =
        a.start_date === a.end_date
          ? format(parseISO(a.start_date), "dd/MM", { locale: ptBR })
          : `${format(parseISO(a.start_date), "dd/MM", { locale: ptBR })} a ${format(parseISO(a.end_date), "dd/MM", { locale: ptBR })}`;
      const motivo = a.notes ? ` — motivo: ${a.notes}` : "";
      return {
        id: `ab-${a.id}`,
        text: `${nm} — ${tipo} (${periodo})${motivo}.`,
        origin: "auto",
        date: a.start_date,
        subject: nm,
        extraDetails: `${tipo} — ${periodo}${a.notes ? `\nMotivo: ${a.notes}` : ""}`,
      };
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

    // Impedimentos abertos/fechados no intervalo
    const entryById = new Map<string, any>();
    (todayEntries as any[]).forEach((e) => entryById.set(e.id, e));
    const impItems: ReportItem[] = impediments.map((imp) => {
      const e = entryById.get(imp.entry_id);
      const label = e ? entryLabel(e) : "—";
      const status = imp.resolved
        ? `sanado${imp.resolved_at ? ` em ${format(parseISO(imp.resolved_at), "dd/MM HH:mm", { locale: ptBR })}` : ""}`
        : "em aberto";
      const dev = e ? (nameByUser.get(e.user_id) ?? "Dev") : "—";
      const sqName = e?.squad_id ? squadById.get(e.squad_id)?.name ?? "Squad" : undefined;
      return {
        id: `imp-${imp.id}`,
        text: `${label} — [${URGENCY_LABELS[imp.urgency]}] ${imp.description} (${status}).`,
        origin: "auto",
        date: e?.entry_date,
        subject: dev,
        squadName: sqName,
        entry: e,
        impediments: [imp],
      };
    });

    return [
      { id: "bom_exemplo", title: "Bom exemplo por squad", icon: Award, origin: "Marcações manuais", items: bomExemplo },
      { id: "melhor_squad", title: "Melhor squad", icon: Trophy, origin: "Marcações manuais", items: melhorSquad },
      { id: "preenchimento_incorreto", title: "Preenchimentos incorretos ou vagos", icon: AlertTriangle, origin: "Regra automática + marcações manuais", items: preenchIncorreto },
      { id: "faltas", title: "Faltas recentes (últimos 7 dias)", icon: CalendarX, origin: "Dados automáticos", items: faltasItems },
      { id: "sem_pre_daily", title: "Sem pré-daily no prazo", icon: Clock, origin: "Dados automáticos", items: semPreDaily },
      { id: "aguardando", title: "Aguardando tarefas", icon: HelpCircle, origin: "Palavras-chave + marcações manuais", items: aguardando },
      { id: "repetidas", title: "Tarefas repetidas ou estagnadas", icon: Repeat, origin: "Regra automática + marcações manuais", items: repetidas },
      { id: "impedimentos", title: "Impedimentos e bloqueios", icon: AlertOctagon, origin: "Dados automáticos", items: impItems },
    ];
  }, [todayEntries, prevEntries, tagsByEntry, absences, meetings, squadMembers, impediments, impsByEntry, squadById, nameByUser]);

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
    const period =
      effectiveFrom === effectiveTo
        ? fmtLong(effectiveFrom)
        : `${fmtLong(effectiveFrom)} a ${fmtLong(effectiveTo)}`;
    const sectionsForPrint = sections.map((s) => ({
      title: s.title,
      items: s.items
        .filter((it) => state[it.id]?.included)
        .map((it) => state[it.id]?.text ?? it.text),
    }));
    printReport(period, sectionsForPrint);
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
          <TabsTrigger value="atual" className="rounded-lg">Relatório atual</TabsTrigger>
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
                    {s.items.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhum registro para este tópico.</p>
                    )}
                    {s.items.map((it) => {
                      const st = state[it.id] ?? { included: true, text: it.text };
                      return (
                        <div
                          key={it.id}
                          className={`rounded-xl border p-3 space-y-2 transition-colors ${
                            st.included ? "bg-background" : "bg-muted/30 opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                              Incluir no relatório final
                            </span>
                            <Switch
                              checked={st.included}
                              onCheckedChange={(v) =>
                                setState((p) => ({ ...p, [it.id]: { ...st, included: v } }))
                              }
                            />
                          </div>
                          <Textarea
                            value={st.text}
                            onChange={(e) =>
                              setState((p) => ({ ...p, [it.id]: { ...st, text: e.target.value } }))
                            }
                            className="rounded-lg text-sm min-h-[64px]"
                          />
                        </div>
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
function SavedReportsPanel() {
  const { data: reports = [], isLoading } = useExecutiveReports();
  const del = useDeleteExecutiveReport();
  const [viewing, setViewing] = useState<ExecutiveReport | null>(null);

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
                      const secs = r.sections.map((s) => ({
                        title: s.title,
                        items: s.items.filter((i) => i.included).map((i) => i.text),
                      }));
                      printReport(period2, secs);
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
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden p-0">
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
              {viewing?.sections
                ?.filter((s) => s.items.some((i) => i.included))
                .map((s) => (
                  <div key={s.id}>
                    <p className="text-xs uppercase tracking-wide font-semibold text-primary mb-1.5">
                      {s.title}
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      {s.items
                        .filter((i) => i.included)
                        .map((i) => (
                          <li key={i.id} className="text-sm whitespace-pre-wrap">
                            {i.text}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
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