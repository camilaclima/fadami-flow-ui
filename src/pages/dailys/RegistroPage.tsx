// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ClipboardEdit,
  CheckCircle2,
  Calendar,
  Plus,
  Users,
  CalendarClock,
  TrendingUp,
  AlertOctagon,
  Trash2,
  CircleCheck,
  CircleDot,
  Pencil,
  Eye,
  Loader2,
  Lock,
  Ban,
  ListChecks,
  MessageSquarePlus,
  Clock,
  X,
  AlertTriangle,
} from "lucide-react";
import { DevActivityCard } from "@/components/dailys/DevActivityCard";
import { useDevDailyEntriesByUser, useUpsertDevDailyEntry } from "@/hooks/useDevDailyEntries";
import {
  useDevDailyImpedimentsByEntries,
  useImpedimentMutations,
  URGENCY_LABELS,
  URGENCY_STYLES,
  type ImpedimentUrgency,
  type DevDailyImpediment,
} from "@/hooks/useDevDailyImpediments";
import {
  useDevDailyActivitiesByUser,
  useDevDailyActivityMutations,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_STYLES,
  type DevDailyActivity,
} from "@/hooks/useDevDailyActivities";
import { useDailySim } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { format, parseISO, addDays, subDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDuration } from "@/lib/formatDuration";

type DraftImpediment = { id: string; description: string; urgency: ImpedimentUrgency };
type PriorResolution = { resolved: boolean | null };
type PastDecision = "pending" | "done" | "inactive";
type DraftPlanned = { id: string; description: string; cardCode: string; notes?: string };
type DraftDone = { id: string; description: string; cardCode: string; notes?: string };

function isWorkday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function workdaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = new Date(start);
  const limit = new Date(end);
  while (cur <= limit) {
    if (isWorkday(cur)) days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function allowedDates(): { value: string; label: string }[] {
  const now = new Date();
  const dow = now.getDay();
  const prev = dow === 1 ? subDays(now, 3) : dow === 0 ? subDays(now, 2) : subDays(now, 1);
  const opts: { value: string; label: string }[] = [];

  if (dow !== 0 && dow !== 6 && now.getHours() >= 17) {
    opts.push({ value: toISO(now), label: `Hoje — ${format(now, "EEEE, dd/MM", { locale: ptBR })}` });
  }
  opts.push({ value: toISO(prev), label: `Ontem útil — ${format(prev, "EEEE, dd/MM", { locale: ptBR })}` });

  return opts;
}

function useMySquadNames(squadIds: string[] | null | undefined) {
  return useQuery({
    queryKey: ["my-squad-names", (squadIds ?? []).join(",")],
    enabled: !!squadIds && squadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("squads") as any).select("id,name").in("id", squadIds!);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export default function RegistroPage() {
  const { current: sim, loading: simLoading } = useDailySim();
  const { data: allEntries = [], isLoading } = useDevDailyEntriesByUser(sim.devUserId);
  const { data: squads = [] } = useMySquadNames(sim.squadIds);
  const upsert = useUpsertDevDailyEntry();

  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

  const hasLegacyEntries = useMemo(() => allEntries.some((e) => !e.product_id), [allEntries]);

  // Busca produtos da squad ativa
  const { data: squadProductIds = [] } = useQuery({
    queryKey: ["squad-products", selectedSquadId],
    enabled: !!selectedSquadId && selectedSquadId !== "legacy",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_products")
        .select("product_id")
        .eq("squad_id", selectedSquadId!);

      if (error) throw error;
      return (data ?? []).map((p) => p.product_id);
    },
  });

  useEffect(() => {
    const ids = sim.squadIds ?? [];
    if (ids.length === 0) {
      setSelectedSquadId(hasLegacyEntries ? "legacy" : null);
      return;
    }
    setSelectedSquadId((prev) => {
      if (prev === "legacy" && hasLegacyEntries) return "legacy";
      return prev && ids.includes(prev) ? prev : ids[0];
    });
  }, [sim.squadIds, hasLegacyEntries]);

  // FILTRO CORRIGIDO: Usa o product_id para validar se a daily pertence à squad
  const entries = useMemo(() => {
    if (selectedSquadId === "legacy") return allEntries.filter((e) => !e.squad_id);

    // Agora filtramos diretamente pelo squad_id da entrada
    return selectedSquadId ? allEntries.filter((e) => e.squad_id === selectedSquadId) : allEntries;
  }, [allEntries, selectedSquadId]);

  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { data: allImpediments = [] } = useDevDailyImpedimentsByEntries(entryIds);
  const { create: createImp, resolve: resolveImp, remove: removeImp } = useImpedimentMutations();
  const { data: allDevActivities = [] } = useDevDailyActivitiesByUser(sim.devUserId);

  const allActivities = useMemo(() => {
    if (selectedSquadId === "legacy") return allDevActivities.filter((a) => !a.squad_id);

    return selectedSquadId ? allDevActivities.filter((a) => a.squad_id === selectedSquadId) : allDevActivities;
  }, [allDevActivities, selectedSquadId]);

  const {
    create: createActivity,
    markCompleted: completeActivity,
    markInactive: inactivateActivity,
    updateNote: updateActivityNote,
  } = useDevDailyActivityMutations();

  const { data: lockedMeetings = [] } = useQuery({
    queryKey: ["daily_meetings_lock", selectedSquadId ?? (sim.squadIds ?? []).join(",")],
    enabled: !!sim.squadIds && sim.squadIds.length > 0,
    queryFn: async () => {
      const scopeIds = selectedSquadId && selectedSquadId !== "legacy" ? [selectedSquadId] : sim.squadIds!;
      const { data, error } = await (supabase.from("daily_meetings") as any)
        .select("meeting_date, squad_id")
        .in("squad_id", scopeIds);
      if (error) throw error;
      return (data ?? []) as { meeting_date: string; squad_id: string }[];
    },
  });

  const lockedDates = useMemo(() => new Set(lockedMeetings.map((m) => m.meeting_date)), [lockedMeetings]);

  const dateOptions = useMemo(() => allowedDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(dateOptions[0]?.value ?? toISO(new Date()));
  const [draftImps, setDraftImps] = useState<DraftImpediment[]>([]);
  const [showNewImp, setShowNewImp] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newUrg, setNewUrg] = useState<ImpedimentUrgency | null>(null);
  const [priorRes, setPriorRes] = useState<Record<string, PriorResolution>>({});
  const [viewImp, setViewImp] = useState<DevDailyImpediment | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImpsModal, setShowImpsModal] = useState(false);
  const [showStagnantModal, setShowStagnantModal] = useState(false);

  const [pastDecisions, setPastDecisions] = useState<Record<string, PastDecision>>({});
  const [plannedDrafts, setPlannedDrafts] = useState<DraftPlanned[]>([]);
  const [doneDrafts, setDoneDrafts] = useState<DraftDone[]>([]);
  const [touched, setTouched] = useState(false);
  const [activityNotes, setActivityNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState<string>("");

  const skipAutoFill = useRef(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  // Cronômetro de preenchimento
  const [fillStartedAt, setFillStartedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open || !fillStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [open, fillStartedAt]);
  const liveDurationSeconds = fillStartedAt
    ? Math.floor((Date.now() - fillStartedAt.getTime()) / 1000)
    : 0;

  const detailEntry = useMemo(() => entries.find((e) => e.id === detailEntryId) ?? null, [entries, detailEntryId]);

  const detailImps = useMemo<DevDailyImpediment[]>(() => {
    if (!detailEntry) return [];
    const D = detailEntry.entry_date;
    return allImpediments.filter((imp) => {
      const origin = entries.find((e) => e.id === imp.entry_id);
      if (!origin) return false;
      return origin.entry_date === D;
    });
  }, [allImpediments, entries, detailEntry]);

  const detailPastActivities = useMemo<DevDailyActivity[]>(() => {
    if (!detailEntry) return [];
    const D = detailEntry.entry_date;
    return allActivities.filter((a) => {
      if (a.closed_entry_id === detailEntry.id && a.status !== "pendente") return true;
      if (a.closed_entry_id === detailEntry.id) return false;
      const origin = a.created_entry_id ? entries.find((e) => e.id === a.created_entry_id) : null;
      const originDate = origin?.entry_date ?? (a.created_at ? a.created_at.slice(0, 10) : null);
      if (!originDate || originDate >= D) return false;
      if (a.closed_entry_id) {
        const closed = entries.find((e) => e.id === a.closed_entry_id);
        if (closed && closed.entry_date <= D) return false;
      }
      return true;
    });
  }, [allActivities, entries, detailEntry]);

  const detailPlannedActivities = useMemo<DevDailyActivity[]>(() => {
    if (!detailEntry) return [];
    return allActivities.filter((a) => {
      if (a.created_entry_id !== detailEntry.id) return false;
      return !(a.closed_entry_id === detailEntry.id && a.status !== "pendente");
    });
  }, [allActivities, detailEntry]);

  const existing = useMemo(() => entries.find((e) => e.entry_date === date), [entries, date]);
  const isLocked = lockedDates.has(date);

  const existingImps = useMemo<DevDailyImpediment[]>(
    () => (existing ? allImpediments.filter((i) => i.entry_id === existing.id) : []),
    [allImpediments, existing],
  );

  const priorOpen = useMemo<DevDailyImpediment[]>(() => {
    return allImpediments
      .filter((imp) => !imp.resolved)
      .filter((imp) => {
        const entry = entries.find((e) => e.id === imp.entry_id);
        if (!entry) return false;
        return entry.entry_date < date;
      });
  }, [allImpediments, entries, date]);

  const carryOverActivities = useMemo<DevDailyActivity[]>(() => {
    return allActivities.filter((a) => {
      if (a.status !== "pendente") return false;
      if (!a.created_entry_id) return true;
      const origin = entries.find((e) => e.id === a.created_entry_id);
      if (!origin) return true;
      return origin.entry_date < date;
    });
  }, [allActivities, entries, date]);

  const closedInEntry = useMemo<DevDailyActivity[]>(() => {
    if (!existing) return [];
    return allActivities.filter((a) => a.closed_entry_id === existing.id && a.status !== "pendente");
  }, [allActivities, existing]);

  const plannedInEntry = useMemo<DevDailyActivity[]>(() => {
    if (!existing) return [];
    return allActivities.filter((a) => {
      if (a.created_entry_id !== existing.id) return false;
      return !(a.closed_entry_id === existing.id && a.status !== "pendente");
    });
  }, [allActivities, existing]);

  const handleOpenCreate = () => {
    const available = dateOptions.find((o) => !entries.some((e) => e.entry_date === o.value));
    if (!available) {
      toast.info("Todas as dailys disponíveis já foram registradas nesta squad.");
      return;
    }
    const targetDate = available.value;
    setMode("create");
    setDate(targetDate);
    setPastDecisions({});
    setPlannedDrafts([]);
    setDoneDrafts([]);
    setTouched(false);
    setDraftImps([]);
    setShowNewImp(false);
    setNewDesc("");
    setNewUrg(null);
    setActivityNotes({});
    setGeneralNotes("");
    const init: Record<string, PriorResolution> = {};
    const openForDate = targetDate;
    const prior = allImpediments
      .filter((imp) => !imp.resolved)
      .filter((imp) => {
        const entry = entries.find((e) => e.id === imp.entry_id);
        if (!entry) return false;
        return entry.entry_date < openForDate;
      });
    prior.forEach((p) => {
      init[p.id] = { resolved: null };
    });
    setPriorRes(init);
    skipAutoFill.current = true;
    setFillStartedAt(new Date());
    setOpen(true);
  };

  const handleOpenEdit = (entry: any) => {
    if (lockedDates.has(entry.entry_date)) {
      toast.info("Esta daily já foi finalizada pelo líder e não pode mais ser editada.");
    }
    setMode("edit");
    setDate(entry.entry_date);
    setPastDecisions({});
    setPlannedDrafts([]);
    setDoneDrafts([]);
    setTouched(false);
    setDraftImps([]);
    setShowNewImp(false);
    setNewDesc("");
    setNewUrg(null);
    setActivityNotes({});
    setGeneralNotes((entry.general_notes as string | null) ?? "");
    const init: Record<string, PriorResolution> = {};
    priorOpen.forEach((p) => {
      init[p.id] = { resolved: null };
    });
    setPriorRes(init);
    setFillStartedAt(entry?.fill_completed_at ? null : new Date());
    setOpen(true);
  };

  useEffect(() => {
    if (open && !skipAutoFill.current) {
      setPastDecisions({});
      setPlannedDrafts([]);
      setDoneDrafts([]);
      setTouched(false);
      setDraftImps([]);
      setShowNewImp(false);
      setNewDesc("");
      setNewUrg(null);
      setActivityNotes({});
      setGeneralNotes((existing?.general_notes as string | null) ?? "");
    }
    skipAutoFill.current = false;
  }, [open, existing?.id, date]);

  // Semeia priorRes conforme priorOpen chega/atualiza, sem apagar rascunhos.
  const priorOpenKey = useMemo(
    () =>
      priorOpen
        .map((p) => p.id)
        .sort()
        .join(","),
    [priorOpen],
  );
  useEffect(() => {
    if (!open) return;
    setPriorRes((prev) => {
      const next: Record<string, PriorResolution> = {};
      priorOpen.forEach((p) => {
        next[p.id] = prev[p.id] ?? { resolved: null };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, priorOpenKey]);

  const isToday = date === toISO(new Date());
  const labelPast = isToday ? "O que fiz hoje" : "O que fiz ontem";
  const labelFuture = isToday ? "O que farei amanhã" : "O que farei hoje";

  const kpis = useMemo(() => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const friday = addDays(monday, 4);
    const weekWorkdays = workdaysInRange(monday, friday);
    const registeredWeekDays = weekWorkdays.filter((wd) => entries.some((e) => e.entry_date === toISO(wd))).length;
    const attendanceRate = weekWorkdays.length > 0 ? Math.round((registeredWeekDays / weekWorkdays.length) * 100) : 0;

    const impedimentsCount = allImpediments.filter((imp) => !imp.resolved).length;

    return {
      attendanceRate,
      impedimentsCount,
    };
  }, [entries, allImpediments]);

  const activeImpedimentsList = useMemo(() => {
    return allImpediments
      .filter((i) => !i.resolved)
      .map((imp) => ({
        imp,
        entryDate: entries.find((e) => e.id === imp.entry_id)?.entry_date ?? null,
      }))
      .sort((a, b) => (b.imp.created_at ?? "").localeCompare(a.imp.created_at ?? ""));
  }, [allImpediments, entries]);

  const stagnantData = useMemo(() => {
    const now = Date.now();
    const pending: Array<{ a: DevDailyActivity; days: number }> = [];
    const resolved: Array<{ a: DevDailyActivity; days: number }> = [];
    allActivities.forEach((a) => {
      if (a.status === "inativa") return;
      const created = new Date(a.created_at).getTime();
      if (a.status === "pendente") {
        const days = Math.floor((now - created) / 86400000);
        if (days > 2) pending.push({ a, days });
      } else if (a.status === "concluida" && a.completed_at) {
        const days = Math.floor((new Date(a.completed_at).getTime() - created) / 86400000);
        if (days > 2) resolved.push({ a, days });
      }
    });
    pending.sort((x, y) => y.days - x.days);
    resolved.sort((x, y) => y.days - x.days);
    return { pending, resolved, total: pending.length + resolved.length };
  }, [allActivities]);

  const submit = async () => {
    setTouched(true);

    const missingDecision = carryOverActivities.find((a) => !pastDecisions[a.id]);
    if (missingDecision) {
      toast.error(`Decida o destino da atividade: "${missingDecision.description}".`);
      return;
    }

    const totalPast =
      carryOverActivities.filter((a) => pastDecisions[a.id] === "done").length +
      doneDrafts.length +
      closedInEntry.filter((a) => a.status === "concluida").length;
    const totalFuture = plannedDrafts.length + plannedInEntry.length;
    if (totalPast === 0 && totalFuture === 0) {
      toast.error("Registre pelo menos uma atividade concluída ou planejada.");
      return;
    }

    if (isLocked) {
      toast.error("Esta daily já foi finalizada pelo líder e não pode mais ser editada.");
      return;
    }

    const pending = priorOpen.filter(
      (p) => priorRes[p.id]?.resolved === null || priorRes[p.id]?.resolved === undefined,
    );
    if (pending.length > 0) {
      toast.error("Indique se cada impedimento anterior em aberto foi sanado ou não.");
      return;
    }

    if (showNewImp && (newDesc.trim() || newUrg)) {
      toast.error("Você começou a criar um impedimento. Clique em 'Adicionar' ou 'Cancelar' antes de salvar.");
      return;
    }

    const pastSnapshot = [
      ...carryOverActivities.map((a) => {
        const dec = pastDecisions[a.id];
        if (dec === "done") return `✓ ${a.description}`;
        if (dec === "inactive") return `⊘ ${a.description} (Inativada)`;
        if (dec === "pending") return `○ ${a.description} (Pendente)`;
        return null;
      }),
      ...closedInEntry.map((a) => {
        if (a.status === "concluida") return `✓ ${a.description}`;
        if (a.status === "inativa") return `⊘ ${a.description} (Inativada)`;
        return null;
      }),
      ...doneDrafts.map((d) => `✓ ${d.description}`),
    ]
      .filter(Boolean)
      .join("\n");

    const futureSnapshot = [
      ...plannedInEntry.map((a) => `○ ${a.description}`),
      ...plannedDrafts.map((d) => `○ ${d.description}`),
    ].join("\n");

    setSaving(true);
    try {
      // Nunca gravar squad_id null quando o dev possui ao menos uma squad.
      // A opção "legacy" existe apenas para visualizar registros antigos;
      // novos saves devem sempre carimbar a squad atual (ou a primeira do dev).
      const fallbackSquadId = sim.squadIds?.[0] ?? null;
      const currentSquadId = selectedSquadId && selectedSquadId !== "legacy" ? selectedSquadId : fallbackSquadId;

      // Guarda anti-duplicação: garante que não existe outra entry para a mesma
      // data + squad antes de inserir.
      const dupExisting =
        existing ??
        allEntries.find(
          (e) => e.entry_date === date && (e.squad_id ?? null) === (currentSquadId ?? null),
        );

      const result = await upsert.mutateAsync({
        id: dupExisting?.id,
        entry_date: date,
        squad_id: currentSquadId,
        did_yesterday: pastSnapshot,
        will_do_today: futureSnapshot,
        impediments: "",
        general_notes: generalNotes.trim() ? generalNotes.trim() : null,
      });

      const entryId = result?.id;

      if (entryId) {
        await Promise.all(
          carryOverActivities.map((a) => {
            const dec = pastDecisions[a.id];
            if (dec === "done") return completeActivity.mutateAsync({ id: a.id, closed_entry_id: entryId });
            if (dec === "inactive") return inactivateActivity.mutateAsync({ id: a.id, closed_entry_id: entryId });
            return Promise.resolve();
          }),
        );

        await Promise.all(
          plannedDrafts.map((d) =>
            createActivity.mutateAsync({
              user_id: sim.devUserId!,
              squad_id: currentSquadId,
              description: d.description,
              card_code: d.cardCode,
              status: "pendente",
              created_entry_id: entryId,
              dev_notes: d.notes?.trim() ? d.notes.trim() : null,
            }),
          ),
        );

        await Promise.all(
          doneDrafts.map((d) =>
            createActivity.mutateAsync({
              user_id: sim.devUserId!,
              squad_id: currentSquadId,
              description: d.description,
              card_code: d.cardCode,
              status: "concluida",
              created_entry_id: entryId,
              closed_entry_id: entryId,
              completed_at: new Date().toISOString(),
              dev_notes: d.notes?.trim() ? d.notes.trim() : null,
            }),
          ),
        );

        await Promise.all(
          Object.entries(activityNotes).map(([id, note]) =>
            updateActivityNote.mutateAsync({ id, dev_notes: note.trim() ? note.trim() : null }),
          ),
        );
      }

      await Promise.all(
        priorOpen.map((p) => {
          const r = priorRes[p.id];
          if (!r) return Promise.resolve();
          return resolveImp.mutateAsync({
            id: p.id,
            resolved: !!r.resolved,
            resolution_note: null,
          });
        }),
      );

      if (entryId && draftImps.length > 0) {
        await Promise.all(
          draftImps.map((d) =>
            createImp.mutateAsync({
              entry_id: entryId,
              description: d.description,
              urgency: d.urgency,
            }),
          ),
        );
      }

      toast.success(mode === "edit" ? "Daily atualizada!" : "Daily registrada!");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const addDraftImpediment = () => {
    const desc = newDesc.trim();
    if (!desc) {
      toast.error("Descreva o impedimento.");
      return;
    }
    if (!newUrg) {
      toast.error("Selecione a urgência.");
      return;
    }
    setDraftImps((prev) => [...prev, { id: crypto.randomUUID(), description: desc, urgency: newUrg }]);
    setNewDesc("");
    setNewUrg(null);
    setShowNewImp(false);
  };

  if (simLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sim.roles?.includes("dev")) {
    return <AccessDeniedCard message="A área 'Minha Daily' é exclusiva para Desenvolvedores." />;
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minha Daily — {sim.personName ?? ""}</h1>
        <p className="text-sm text-muted-foreground">Registre seu status diário e acompanhe o histórico.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" /> Squad ativa no painel:
          </span>
          <Select value={selectedSquadId ?? undefined} onValueChange={(v) => setSelectedSquadId(v)}>
            <SelectTrigger className="h-8 w-[260px] text-xs bg-background">
              <SelectValue placeholder="Selecione a squad" />
            </SelectTrigger>
            <SelectContent>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
              {hasLegacyEntries && (
                <SelectItem value="legacy" className="text-amber-600 font-medium">
                  📁 Registros Antigos (Sem Squad)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setShowStagnantModal(true)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") setShowStagnantModal(true);
          }}
          className="rounded-2xl cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${stagnantData.total > 0 ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Tarefas Estagnadas</p>
              <p className="text-lg font-semibold leading-tight">
                {stagnantData.total} tarefa{stagnantData.total !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Sua Assiduidade</p>
              <p className="text-lg font-semibold leading-tight">{kpis.attendanceRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setShowImpsModal(true)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") setShowImpsModal(true);
          }}
          className="rounded-2xl cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpis.impedimentsCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}
            >
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Impedimentos Ativos</p>
              <p className="text-lg font-semibold leading-tight">
                {kpis.impedimentsCount} Impedimento{kpis.impedimentsCount !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-5 flex justify-end">
        {(() => {
          const hasAvailableDate = dateOptions.some(
            (o) => !entries.some((e) => e.entry_date === o.value),
          );
          return (
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl gap-2"
              disabled={!hasAvailableDate}
              title={
                hasAvailableDate
                  ? undefined
                  : "Todas as dailys disponíveis já foram registradas. Novo registro liberará às 17h."
              }
            >
              <Plus className="w-4 h-4" /> Registrar daily
            </Button>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {isLoading && <p className="text-sm text-muted-foreground col-span-full">Carregando...</p>}
        {!isLoading && entries.length === 0 && (
          <Card className="rounded-2xl col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum registro encontrado nesta Squad.
            </CardContent>
          </Card>
        )}
        {entries.map((e) => {
          const D = e.entry_date;
          const dayLocked = lockedDates.has(D);
          const imps = allImpediments.filter((imp) => {
            const origin = entries.find((e2) => e2.id === imp.entry_id);
            if (!origin) return false;
            const created = origin.entry_date;
            if (created > D) return false;
            if (!imp.resolved) return true;
            const resolvedDate = imp.resolved_at ? imp.resolved_at.slice(0, 10) : null;
            return resolvedDate ? resolvedDate >= D : true;
          });
          const resolvedCount = imps.filter((i) => i.resolved).length;
          const openCount = imps.length - resolvedCount;
          return (
            <Card
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailEntryId(e.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") setDetailEntryId(e.id);
              }}
              className="rounded-2xl cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
                      <Calendar className="w-3 h-3 text-primary" />
                      {format(parseISO(e.entry_date), "EEE", { locale: ptBR })}
                    </div>
                    <p className="text-sm font-semibold leading-tight mt-0.5 truncate">
                      {format(parseISO(e.entry_date), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {dayLocked && <Lock className="w-3.5 h-3.5 text-amber-500" aria-label="Daily finalizada" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleOpenEdit(e);
                      }}
                      title={dayLocked ? "Daily finalizada (somente leitura)" : "Editar daily"}
                    >
                      {dayLocked ? (
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                  </div>
                </div>

                {imps.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Sem impedimentos
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {imps.length} impediment{imps.length === 1 ? "o" : "os"}
                      </span>
                      <div className="flex items-center gap-1">
                        {resolvedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"
                          >
                            <CircleCheck className="w-2.5 h-2.5" /> {resolvedCount} sanado
                            {resolvedCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {openCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30"
                          >
                            {openCount} em aberto
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                  Registrado {format(parseISO(e.created_at), "dd/MM HH:mm")}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detalhes da daily */}
      <Dialog open={!!detailEntryId} onOpenChange={(o) => !o && setDetailEntryId(null)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {detailEntry && format(parseISO(detailEntry.entry_date), "PPP", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                    Ontem
                  </p>
                  <ReadonlyActivitiesList
                    activities={detailPastActivities}
                    fallback={detailEntry.did_yesterday}
                    empty="—"
                    showStatus
                  />
                </div>
                <div className="rounded-xl border bg-primary/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80 mb-1.5">Hoje</p>
                  <ReadonlyActivitiesList
                    activities={detailPlannedActivities}
                    fallback={detailEntry.will_do_today}
                    empty="—"
                  />
                </div>
              </div>
              <div className="rounded-xl border bg-orange-500/5 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-orange-600 mb-2 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> Impedimentos
                </p>
                {detailImps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum impedimento registrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailImps.map((imp) => (
                      <div key={imp.id} className="rounded-lg border bg-background/70 p-2 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                            {URGENCY_LABELS[imp.urgency]}
                          </Badge>
                          {(() => {
                            const origin = entries.find((e) => e.id === imp.entry_id);
                            if (!origin || !detailEntry) return null;
                            if (origin.entry_date === detailEntry.entry_date) return null;
                            return (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-muted text-muted-foreground border-border"
                              >
                                Criado em {format(parseISO(origin.entry_date), "dd/MM", { locale: ptBR })}
                              </Badge>
                            );
                          })()}
                          {imp.resolved ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"
                            >
                              <CircleCheck className="w-2.5 h-2.5" /> Sanado
                              {imp.resolved_at && (
                                <span className="font-normal">
                                  em {format(parseISO(imp.resolved_at), "dd/MM", { locale: ptBR })}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30"
                            >
                              Em aberto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">{imp.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MessageSquarePlus className="w-3 h-3" /> Observações gerais do dev
                </p>
                {detailEntry.general_notes?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{detailEntry.general_notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma observação geral registrada.</p>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground text-right">
                Registrado em {format(parseISO(detailEntry.created_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
          )}
          <DialogFooter>
            {detailEntry && (
              <Button
                variant="outline"
                className="rounded-xl gap-1.5"
                onClick={() => {
                  const e = detailEntry;
                  setDetailEntryId(null);
                  handleOpenEdit(e);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            )}
            <Button onClick={() => setDetailEntryId(null)} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Daily protegido contra cliques acidentais */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent
          className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <ClipboardEdit className="w-5 h-5 text-primary" />
            <DialogTitle>
              Registrar daily
              {mode === "edit" && (
                <Badge variant="outline" className="ml-2">
                  Editando
                </Badge>
              )}
              {isLocked && (
                <Badge variant="outline" className="ml-2 gap-1 bg-muted text-muted-foreground border-border">
                  <Lock className="w-3 h-3" /> Finalizada
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 min-w-0">
            {isLocked && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-700">Daily finalizada pelo líder</p>
                  <p className="text-xs text-amber-700/90 mt-0.5">
                    O registro desta data está em modo somente-leitura. Fale com seu líder caso precise ajustar algo.
                  </p>
                </div>
              </div>
            )}
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data de referência
              </Label>
              <Select value={date} onValueChange={setDate} disabled={isLocked}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ActivitiesPastSection
              label={labelPast}
              locked={isLocked}
              carryOver={carryOverActivities}
              closedInEntry={closedInEntry}
              decisions={pastDecisions}
              setDecisions={setPastDecisions}
              doneDrafts={doneDrafts}
              setDoneDrafts={setDoneDrafts}
              entries={entries}
              touched={touched}
              activityNotes={activityNotes}
              setActivityNotes={setActivityNotes}
            />

            <ActivitiesFutureSection
              label={labelFuture}
              locked={isLocked}
              plannedInEntry={plannedInEntry}
              plannedDrafts={plannedDrafts}
              setPlannedDrafts={setPlannedDrafts}
              activityNotes={activityNotes}
              setActivityNotes={setActivityNotes}
            />

            {priorOpen.length > 0 && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <AlertOctagon className="w-4 h-4 text-orange-500" />
                  Impedimentos anteriores em aberto
                  <span className="text-xs text-muted-foreground font-normal">(sinalize cada um antes de salvar)</span>
                </Label>
                {priorOpen.map((p) => {
                  const r = priorRes[p.id] ?? { resolved: null };
                  const entry = entries.find((e) => e.id === p.entry_id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-background p-2 min-w-0">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${URGENCY_STYLES[p.urgency]}`}>
                        {URGENCY_LABELS[p.urgency]}
                      </Badge>
                      {entry && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {format(parseISO(entry.entry_date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setViewImp(p)}
                        className="text-sm flex-1 min-w-0 truncate text-left hover:underline cursor-pointer"
                        title="Ver detalhes do impedimento"
                      >
                        {p.description}
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setViewImp(p)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant={r.resolved === true ? "default" : "outline"}
                          className="rounded-lg gap-1.5 h-8"
                          onClick={() => setPriorRes((prev) => ({ ...prev, [p.id]: { resolved: true } }))}
                          disabled={isLocked}
                        >
                          <CircleCheck className="w-3.5 h-3.5" /> Sanado
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={r.resolved === false ? "destructive" : "outline"}
                          className="rounded-lg gap-1.5 h-8"
                          onClick={() => setPriorRes((prev) => ({ ...prev, [p.id]: { resolved: false } }))}
                          disabled={isLocked}
                        >
                          <CircleDot className="w-3.5 h-3.5" /> Ainda impedido
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Impedimentos <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>

              {existingImps.length > 0 && (
                <div className="space-y-2">
                  {existingImps.map((imp) => (
                    <div key={imp.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5">
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${URGENCY_STYLES[imp.urgency]}`}>
                        {URGENCY_LABELS[imp.urgency]}
                      </Badge>
                      <p className="text-sm flex-1 whitespace-pre-wrap break-words">{imp.description}</p>
                      {imp.resolved ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        >
                          Sanado
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeImp.mutate(imp.id)}
                          title="Remover"
                          disabled={isLocked}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {draftImps.length > 0 && (
                <div className="space-y-2">
                  {draftImps.map((d) => (
                    <div key={d.id} className="flex items-start gap-2 rounded-lg border bg-background p-2.5">
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${URGENCY_STYLES[d.urgency]}`}>
                        {URGENCY_LABELS[d.urgency]}
                      </Badge>
                      <p className="text-sm flex-1 whitespace-pre-wrap break-words">{d.description}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDraftImps((prev) => prev.filter((x) => x.id !== d.id))}
                        disabled={isLocked}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!showNewImp ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewImp(true)}
                  className="rounded-xl gap-1.5"
                  disabled={isLocked}
                >
                  <Plus className="w-4 h-4" /> Criar impedimento
                </Button>
              ) : (
                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <Textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Descreva o impedimento..."
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={newUrg ?? undefined} onValueChange={(v) => setNewUrg(v as ImpedimentUrgency)}>
                      <SelectTrigger className="sm:w-56">
                        <SelectValue placeholder="Urgência *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Urgência: Baixa</SelectItem>
                        <SelectItem value="medium">Urgência: Média</SelectItem>
                        <SelectItem value="high">Urgência: Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addDraftImpediment} className="rounded-xl gap-1.5">
                      <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowNewImp(false);
                        setNewDesc("");
                        setNewUrg(null);
                      }}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                Observações gerais <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Textarea
                rows={3}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Comentários gerais sobre esta daily (contexto, decisões, alertas...)"
                disabled={isLocked}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving || upsert.isPending || isLocked} className="rounded-xl gap-2">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Bloqueada
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {existing ? "Atualizar" : "Salvar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewImp}
        onOpenChange={(o) => {
          if (!o) setViewImp(null);
        }}
      >
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-orange-500" />
              Detalhes do impedimento
            </DialogTitle>
          </DialogHeader>
          {viewImp && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${URGENCY_STYLES[viewImp.urgency]}`}>
                  Urgência: {URGENCY_LABELS[viewImp.urgency]}
                </Badge>
                {(() => {
                  const entry = entries.find((e) => e.id === viewImp.entry_id);
                  return entry ? (
                    <span className="text-xs text-muted-foreground">
                      Criado em {format(parseISO(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm whitespace-pre-wrap break-words">{viewImp.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewImp(null)} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImpsModal} onOpenChange={setShowImpsModal}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-orange-500" /> Impedimentos ativos
              <Badge variant="outline" className="ml-1">
                {activeImpedimentsList.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {activeImpedimentsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum impedimento em aberto.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeImpedimentsList.map(({ imp, entryDate }) => (
                <div
                  key={imp.id}
                  className="flex items-start gap-2.5 p-3 rounded-xl border bg-orange-500/5 border-orange-500/20"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground break-words whitespace-pre-wrap">
                      {imp.description}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      {entryDate && (
                        <>
                          <span>Criado em {format(parseISO(entryDate), "dd/MM", { locale: ptBR })}</span>
                          <span>•</span>
                        </>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                        {URGENCY_LABELS[imp.urgency]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowImpsModal(false)} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStagnantModal} onOpenChange={setShowStagnantModal}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> Tarefas estagnadas
              <span className="text-xs font-normal text-muted-foreground">(mais de 2 dias)</span>
            </DialogTitle>
          </DialogHeader>
          {stagnantData.total === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma tarefa estagnada.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-orange-600 mb-2 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5" /> Ainda pendentes ({stagnantData.pending.length})
                </p>
                {stagnantData.pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stagnantData.pending.map(({ a, days }) => (
                      <div
                        key={a.id}
                        className="rounded-lg border bg-orange-500/5 border-orange-500/20 p-2.5 flex items-start gap-2"
                      >
                        <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words whitespace-pre-wrap">{a.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Pendente há {days} dia{days !== 1 ? "s" : ""} · criada em{" "}
                            {format(parseISO(a.created_at), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                  <CircleCheck className="w-3.5 h-3.5" /> Sanadas ({stagnantData.resolved.length})
                </p>
                {stagnantData.resolved.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stagnantData.resolved.map(({ a, days }) => (
                      <div
                        key={a.id}
                        className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-2.5 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words whitespace-pre-wrap">{a.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Levou {days} dia{days !== 1 ? "s" : ""} · concluída em{" "}
                            {a.completed_at ? format(parseISO(a.completed_at), "dd/MM", { locale: ptBR }) : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowStagnantModal(false)} className="rounded-xl">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteButton({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const has = value.trim().length > 0;
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const moveFocusToNext = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => {
      if (el.offsetParent === null) return false;
      if (el.closest("[data-radix-popper-content-wrapper]")) return false;
      const ariaHidden = el.closest('[aria-hidden="true"]');
      if (ariaHidden) return false;
      return true;
    });
    const idx = focusable.indexOf(trigger);
    const next = focusable[idx + 1];
    setOpen(false);
    if (next) {
      setTimeout(() => next.focus(), 0);
    } else {
      trigger.blur();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title={has ? "Editar observação" : "Adicionar observação"}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setTimeout(() => textareaRef.current?.focus(), 0);
          }}
          className={`h-7 w-7 rounded-lg relative shrink-0 ${
            has ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40" : "text-muted-foreground"
          }`}
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          {has && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" onKeyDown={(e) => e.stopPropagation()}>
        <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
          <MessageSquarePlus className="w-3 h-3" /> Observação sobre esta demanda
        </Label>
        <Textarea
          ref={textareaRef}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              moveFocusToNext();
            }
          }}
          placeholder="Contexto, dificuldades, decisões..."
          className="text-sm"
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

function ReadonlyActivitiesList({
  activities,
  fallback,
  empty,
  showStatus = false,
}: {
  activities: DevDailyActivity[];
  fallback: string | null;
  empty: string;
  showStatus?: boolean;
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">
        {fallback?.trim() ? fallback : <span className="text-muted-foreground">{empty}</span>}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {activities.map((a) => (
        <DevActivityCard
          key={a.id}
          kind={a.status === "concluida" ? "done" : a.status === "inativa" ? "inactive" : "pending"}
          description={a.card_code ? `#${a.card_code} ${a.description}` : a.description}
          createdAt={a.created_at}
          devNotes={a.dev_notes}
        />
      ))}
    </div>
  );
}

function ActivitiesPastSection(props: {
  label: string;
  locked: boolean;
  carryOver: DevDailyActivity[];
  closedInEntry: DevDailyActivity[];
  decisions: Record<string, PastDecision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, PastDecision>>>;
  doneDrafts: DraftDone[];
  setDoneDrafts: React.Dispatch<React.SetStateAction<DraftDone[]>>;
  entries: Array<{ id: string; entry_date: string }>;
  touched: boolean;
  activityNotes: Record<string, string>;
  setActivityNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const {
    label,
    locked,
    carryOver,
    closedInEntry,
    decisions,
    setDecisions,
    doneDrafts,
    setDoneDrafts,
    entries,
    touched,
    activityNotes,
    setActivityNotes,
  } = props;

  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newNote, setNewNote] = useState("");

  const addExtra = () => {
    const d = newDesc.trim();
    const code = newCode.trim();
    if (!d) return;
    if (code && !/^\d+$/.test(code)) {
      toast.error("O Código do Card deve conter apenas números.");
      return;
    }
    setDoneDrafts((p) => [
      ...p,
      { id: crypto.randomUUID(), description: d, cardCode: code, notes: newNote.trim() || undefined },
    ]);
    setNewDesc("");
    setNewCode("");
    setNewNote("");
  };

  const editDraft = (d: DraftDone) => {
    setNewDesc(d.description);
    setNewCode(d.cardCode);
    setNewNote(d.notes ?? "");
    setDoneDrafts((p) => p.filter((x) => x.id !== d.id));
  };

  const setDec = (id: string, dec: PastDecision) => {
    setDecisions((p) => ({ ...p, [id]: dec }));
  };

  const empty = carryOver.length === 0 && closedInEntry.length === 0 && doneDrafts.length === 0;

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">{label}</Label>
        <span className="text-xs text-muted-foreground">(marque o destino de cada atividade planejada)</span>
      </div>

      {carryOver.length === 0 && closedInEntry.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhuma atividade herdada de dailys anteriores.</p>
      )}

      {carryOver.map((a) => {
        const dec = decisions[a.id];
        const origin = entries.find((e) => e.id === a.created_entry_id);
        const missing = touched && !dec;
        return (
          <div
            key={a.id}
            className={`rounded-lg border p-2.5 bg-background flex items-start gap-2 ${missing ? "border-orange-500" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm break-words">
                {a.card_code && (
                  <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                    #{a.card_code}
                  </Badge>
                )}
                {a.description}
              </p>
              {origin && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Planejada em {format(parseISO(origin.entry_date), "dd/MM", { locale: ptBR })}
                </p>
              )}
              {missing && <p className="text-[11px] text-orange-500 mt-0.5">Escolha um destino.</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={dec === "done" ? "default" : "outline"}
                className={`h-8 gap-1 ${dec === "done" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                onClick={() => setDec(a.id, "done")}
                disabled={locked}
                title="Marcar como concluída"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Concluí
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dec === "pending" ? "default" : "outline"}
                className="h-8 gap-1"
                onClick={() => setDec(a.id, "pending")}
                disabled={locked}
                title="Manter pendente"
              >
                <CircleDot className="w-3.5 h-3.5" /> Pendente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dec === "inactive" ? "default" : "outline"}
                className={`h-8 gap-1 ${dec === "inactive" ? "bg-muted-foreground/60 hover:bg-muted-foreground/70" : ""}`}
                onClick={() => setDec(a.id, "inactive")}
                disabled={locked}
                title="Inativar"
              >
                <Ban className="w-3.5 h-3.5" /> Inativar
              </Button>
              <NoteButton
                value={activityNotes[a.id] ?? a.dev_notes ?? ""}
                onChange={(v) => setActivityNotes((p) => ({ ...p, [a.id]: v }))}
                disabled={locked}
              />
            </div>
          </div>
        );
      })}

      {closedInEntry.map((a) => (
        <div key={a.id} className="rounded-lg border p-2.5 bg-muted/40 flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${ACTIVITY_STATUS_STYLES[a.status]}`}>
            {ACTIVITY_STATUS_LABELS[a.status]}
          </Badge>
          <p className="text-sm flex-1 min-w-0 break-words">
            {a.card_code && (
              <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                #{a.card_code}
              </Badge>
            )}
            {a.description}
          </p>
          <NoteButton
            value={activityNotes[a.id] ?? a.dev_notes ?? ""}
            onChange={(v) => setActivityNotes((p) => ({ ...p, [a.id]: v }))}
            disabled={locked}
          />
        </div>
      ))}

      {doneDrafts.map((d) => (
        <div
          key={d.id}
          className="rounded-lg border p-2.5 bg-emerald-500/5 border-emerald-500/30 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm flex-1 min-w-0 break-words">
            {d.cardCode && (
              <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                #{d.cardCode}
              </Badge>
            )}
            {d.description}
          </p>
          <NoteButton
            value={d.notes ?? ""}
            onChange={(v) => setDoneDrafts((p) => p.map((x) => (x.id === d.id ? { ...x, notes: v } : x)))}
            disabled={locked}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editDraft(d)}
            disabled={locked}
            title="Editar atividade"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setDoneDrafts((p) => p.filter((x) => x.id !== d.id))}
            disabled={locked}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {!locked && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="Nº card"
            inputMode="numeric"
            pattern="[0-9]*"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
            className="w-24 shrink-0"
          />
          <Input
            placeholder="Fiz algo fora do planejado? Descreva aqui..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExtra();
              }
            }}
          />
          <NoteButton value={newNote} onChange={setNewNote} disabled={locked} />
          <Button type="button" size="sm" variant="outline" onClick={addExtra} className="gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>
      )}

      {empty && !locked && (
        <p className="text-[11px] text-muted-foreground">
          Dica: se não havia atividades planejadas, use "+ Adicionar" para registrar o que você fez hoje.
        </p>
      )}
    </div>
  );
}

function ActivitiesFutureSection(props: {
  label: string;
  locked: boolean;
  plannedInEntry: DevDailyActivity[];
  plannedDrafts: DraftPlanned[];
  setPlannedDrafts: React.Dispatch<React.SetStateAction<DraftPlanned[]>>;
  activityNotes: Record<string, string>;
  setActivityNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { label, locked, plannedInEntry, plannedDrafts, setPlannedDrafts, activityNotes, setActivityNotes } = props;
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newNote, setNewNote] = useState("");

  const add = () => {
    const d = newDesc.trim();
    const code = newCode.trim();
    if (!d) return;
    if (code && !/^\d+$/.test(code)) {
      toast.error("O Código do Card deve conter apenas números.");
      return;
    }
    setPlannedDrafts((p) => [
      ...p,
      { id: crypto.randomUUID(), description: d, cardCode: code, notes: newNote.trim() || undefined },
    ]);

    setNewDesc("");
    setNewCode("");
    setNewNote("");
  };

  const editDraft = (d: DraftPlanned) => {
    setNewDesc(d.description);
    setNewCode(d.cardCode);
    setNewNote(d.notes ?? "");
    setPlannedDrafts((p) => p.filter((x) => x.id !== d.id));
  };

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-primary" />
        <Label className="text-sm font-semibold">{label}</Label>
        <span className="text-xs text-muted-foreground">(uma atividade por linha)</span>
      </div>

      {plannedInEntry.map((a) => (
        <div key={a.id} className="rounded-lg border p-2.5 bg-muted/40 flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm flex-1 min-w-0 break-words">
            {a.card_code && (
              <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                #{a.card_code}
              </Badge>
            )}
            {a.description}
          </p>
          <Badge variant="outline" className="text-[10px]">
            Já salva
          </Badge>
          <NoteButton
            value={activityNotes[a.id] ?? a.dev_notes ?? ""}
            onChange={(v) => setActivityNotes((p) => ({ ...p, [a.id]: v }))}
            disabled={locked}
          />
        </div>
      ))}

      {plannedDrafts.map((d) => (
        <div key={d.id} className="rounded-lg border p-2.5 bg-background flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm flex-1 min-w-0 break-words">
            {d.cardCode && (
              <Badge variant="outline" className="mr-1.5 font-mono text-[10px]">
                #{d.cardCode}
              </Badge>
            )}
            {d.description}
          </p>
          <NoteButton
            value={d.notes ?? ""}
            onChange={(v) => setPlannedDrafts((p) => p.map((x) => (x.id === d.id ? { ...x, notes: v } : x)))}
            disabled={locked}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editDraft(d)}
            disabled={locked}
            title="Editar atividade"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setPlannedDrafts((p) => p.filter((x) => x.id !== d.id))}
            disabled={locked}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {!locked && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="Nº card"
            inputMode="numeric"
            pattern="[0-9]*"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
            className="w-24 shrink-0"
          />
          <Input
            placeholder="Ex.: Finalizar tela de login"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <NoteButton value={newNote} onChange={setNewNote} disabled={locked} />
          <Button type="button" size="sm" onClick={add} className="gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Adicionar atividade
          </Button>
        </div>
      )}

      {plannedInEntry.length === 0 && plannedDrafts.length === 0 && locked && (
        <p className="text-xs text-muted-foreground italic">Nenhuma atividade planejada.</p>
      )}
    </div>
  );
}
