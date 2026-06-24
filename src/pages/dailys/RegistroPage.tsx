import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardEdit, AlertTriangle, CheckCircle2, Calendar, Plus, Users,
  CalendarClock, TrendingUp, AlertOctagon, Trash2, CircleCheck, CircleDot,
  Pencil, Eye,
} from "lucide-react";
import { useDevDailyEntriesByUser, useUpsertDevDailyEntry } from "@/hooks/useDevDailyEntries";
import {
  useDevDailyImpedimentsByEntries,
  useImpedimentMutations,
  URGENCY_LABELS,
  URGENCY_STYLES,
  type ImpedimentUrgency,
  type DevDailyImpediment,
} from "@/hooks/useDevDailyImpediments";
import { useDailySim } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { format, parseISO, addDays, subDays, startOfWeek, isWeekend, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type DraftImpediment = { id: string; description: string; urgency: ImpedimentUrgency };
type PriorResolution = { resolved: boolean | null };

function isWorkday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function nextWorkday(d: Date): Date {
  const next = addDays(d, 1);
  if (isWeekend(next)) {
    // se sábado, pula para segunda
    return addDays(next, next.getDay() === 6 ? 2 : 1);
  }
  return next;
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

/** Datas permitidas: hoje + dia útil anterior (segunda → sexta). */
function allowedDates(): { value: string; label: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=dom, 6=sáb
  const prev = dow === 1 ? subDays(today, 3) : dow === 0 ? subDays(today, 2) : subDays(today, 1);
  const opts = [
    { value: toISO(today), label: `Hoje — ${format(today, "EEEE, dd/MM", { locale: ptBR })}` },
    { value: toISO(prev), label: `Ontem útil — ${format(prev, "EEEE, dd/MM", { locale: ptBR })}` },
  ];
  // Remove sáb/dom de "hoje" se aplicável
  return opts.filter((o) => {
    const d = parseISO(o.value).getDay();
    return d !== 0 && d !== 6;
  });
}

function useMySquadNames(squadIds: string[] | null | undefined) {
  return useQuery({
    queryKey: ["my-squad-names", (squadIds ?? []).join(",")],
    enabled: !!squadIds && squadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("squads") as any)
        .select("id,name")
        .in("id", squadIds!);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export default function RegistroPage() {
  const { current: sim } = useDailySim();
  const { data: entries = [], isLoading } = useDevDailyEntriesByUser(sim.devUserId);
  const { data: squads = [] } = useMySquadNames(sim.squadIds);
  const upsert = useUpsertDevDailyEntry();
  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { data: allImpediments = [] } = useDevDailyImpedimentsByEntries(entryIds);
  const { create: createImp, resolve: resolveImp, remove: removeImp } = useImpedimentMutations();

  const dateOptions = useMemo(() => allowedDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(dateOptions[0]?.value ?? toISO(new Date()));
  const [didYesterday, setDidYesterday] = useState("");
  const [willDoToday, setWillDoToday] = useState("");
  const [touched, setTouched] = useState({ did: false, will: false });
  const [draftImps, setDraftImps] = useState<DraftImpediment[]>([]);
  const [showNewImp, setShowNewImp] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newUrg, setNewUrg] = useState<ImpedimentUrgency | null>(null);
  const [priorRes, setPriorRes] = useState<Record<string, PriorResolution>>({});

  const skipAutoFill = useRef(false);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const detailEntry = useMemo(
    () => entries.find((e) => e.id === detailEntryId) ?? null,
    [entries, detailEntryId]
  );
  const detailImps = useMemo<DevDailyImpediment[]>(
    () => (detailEntry ? allImpediments.filter((i) => i.entry_id === detailEntry.id) : []),
    [allImpediments, detailEntry]
  );

  const existing = useMemo(() => entries.find((e) => e.entry_date === date), [entries, date]);

  // Impedimentos da entry sendo editada (já persistidos)
  const existingImps = useMemo<DevDailyImpediment[]>(
    () => (existing ? allImpediments.filter((i) => i.entry_id === existing.id) : []),
    [allImpediments, existing]
  );

  // Impedimentos em aberto de dailys ANTERIORES à data selecionada
  const priorOpen = useMemo<DevDailyImpediment[]>(() => {
    return allImpediments
      .filter((imp) => !imp.resolved)
      .filter((imp) => {
        const entry = entries.find((e) => e.id === imp.entry_id);
        if (!entry) return false;
        return entry.entry_date < date;
      });
  }, [allImpediments, entries, date]);

  const handleOpenCreate = () => {
    const available = dateOptions.find((o) => !entries.some((e) => e.entry_date === o.value));
    const targetDate = available?.value ?? dateOptions[0]?.value ?? toISO(new Date());
    setDate(targetDate);
    setDidYesterday("");
    setWillDoToday("");
    setTouched({ did: false, will: false });
    setDraftImps([]);
    setShowNewImp(false);
    setNewDesc("");
    setNewUrg(null);
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
    setOpen(true);
  };

  const handleOpenEdit = (entry: any) => {
    setDate(entry.entry_date);
    setDidYesterday(entry.did_yesterday ?? "");
    setWillDoToday(entry.will_do_today ?? "");
    setTouched({ did: false, will: false });
    setDraftImps([]);
    setShowNewImp(false);
    setNewDesc("");
    setNewUrg(null);
    const init: Record<string, PriorResolution> = {};
    priorOpen.forEach((p) => {
      init[p.id] = { resolved: null };
    });
    setPriorRes(init);
    setOpen(true);
  };

  useEffect(() => {
    if (open && !skipAutoFill.current) {
      setDidYesterday(existing?.did_yesterday ?? "");
      setWillDoToday(existing?.will_do_today ?? "");
      setTouched({ did: false, will: false });
      setDraftImps([]);
      setShowNewImp(false);
      setNewDesc("");
      setNewUrg(null);
      const init: Record<string, PriorResolution> = {};
      priorOpen.forEach((p) => {
        init[p.id] = { resolved: null };
      });
      setPriorRes(init);
    }
    skipAutoFill.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id, date]);

  const didEmpty = !didYesterday.trim();
  const willEmpty = !willDoToday.trim();

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const today = new Date();
    const tomorrow = nextWorkday(today);
    const tomorrowISO = toISO(tomorrow);
    const tomorrowRegistered = entries.some((e) => e.entry_date === tomorrowISO);

    // Assiduidade: semana atual (segunda → sexta)
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const friday = addDays(monday, 4);
    const weekWorkdays = workdaysInRange(monday, friday);
    const registeredWeekDays = weekWorkdays.filter((wd) =>
      entries.some((e) => e.entry_date === toISO(wd))
    ).length;
    const attendanceRate = weekWorkdays.length > 0
      ? Math.round((registeredWeekDays / weekWorkdays.length) * 100)
      : 0;

    // Impedimentos na semana atual (segunda → hoje)
    const weekUntilToday = workdaysInRange(monday, today);
    const weekEntryIds = new Set(
      entries
        .filter((e) => {
          const ed = parseISO(e.entry_date);
          return weekUntilToday.some((wd) => isSameDay(ed, wd));
        })
        .map((e) => e.id)
    );
    const impedimentsCount = allImpediments.filter(
      (imp) => !imp.resolved && weekEntryIds.has(imp.entry_id)
    ).length;

    return {
      tomorrowRegistered,
      attendanceRate,
      impedimentsCount,
    };
  }, [entries, allImpediments]);

  const submit = async () => {
    setTouched({ did: true, will: true });
    if (didEmpty || willEmpty) {
      toast.error("Preencha os campos obrigatórios: 'O que fiz ontem?' e 'O que farei hoje?'.");
      return;
    }
    // Valida resolução dos impedimentos anteriores em aberto
    const pending = priorOpen.filter((p) => priorRes[p.id]?.resolved === null || priorRes[p.id]?.resolved === undefined);
    if (pending.length > 0) {
      toast.error("Indique se cada impedimento anterior em aberto foi sanado ou não.");
      return;
    }

    // Valida impedimento "rascunho" não adicionado
    if (showNewImp && (newDesc.trim() || newUrg)) {
      toast.error("Você começou a criar um impedimento. Clique em 'Adicionar' ou 'Cancelar' antes de salvar.");
      return;
    }

    const result = await upsert.mutateAsync({
      id: existing?.id,
      entry_date: date,
      squad_id: sim.squadIds?.[0] ?? null,
      did_yesterday: didYesterday,
      will_do_today: willDoToday,
      impediments: "",
    });

    const entryId = result?.id;

    // Persiste resoluções de impedimentos anteriores
    await Promise.all(
      priorOpen.map((p) => {
        const r = priorRes[p.id];
        if (!r) return Promise.resolve();
        return resolveImp.mutateAsync({
          id: p.id,
          resolved: !!r.resolved,
          resolution_note: null,
        });
      })
    );

    // Persiste novos impedimentos adicionados nesta daily
    if (entryId && draftImps.length > 0) {
      await Promise.all(
        draftImps.map((d) =>
          createImp.mutateAsync({
            entry_id: entryId,
            description: d.description,
            urgency: d.urgency,
          })
        )
      );
    }

    setOpen(false);
  };

  const addDraftImpediment = () => {
    const desc = newDesc.trim();
    if (!desc) {
      toast.error("Descreva o impedimento.");
      return;
    }
    if (!newUrg) {
      toast.error("Selecione a urgência do impedimento.");
      return;
    }
    setDraftImps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: desc, urgency: newUrg },
    ]);
    setNewDesc("");
    setNewUrg(null);
    setShowNewImp(false);
  };

  if (sim.role !== "dev") {
    return (
      <AccessDeniedCard message="A área 'Minha Daily' é exclusiva para Desenvolvedores." />
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minha Daily — {sim.personName ?? ""}</h1>
        <p className="text-sm text-muted-foreground">Registre seu status diário e acompanhe o histórico.</p>
        {squads.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> Squad{squads.length > 1 ? "s" : ""}:
            </span>
            {squads.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* Status de Amanhã */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpis.tomorrowRegistered ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Status de Amanhã</p>
              <Badge variant={kpis.tomorrowRegistered ? "default" : "destructive"} className="text-xs">
                {kpis.tomorrowRegistered ? "Concluído" : "Pendente"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Assiduidade Pessoal */}
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

        {/* Impedimentos */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpis.impedimentsCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Impedimentos Ativos</p>
              <p className="text-lg font-semibold leading-tight">{kpis.impedimentsCount} Impedimento{kpis.impedimentsCount !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-5 flex justify-end">
        <Button onClick={handleOpenCreate} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Registrar daily
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && entries.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">Nenhum registro ainda.</CardContent>
          </Card>
        )}
        {entries.map((e) => {
          const imps = allImpediments.filter((i) => i.entry_id === e.id);
          const resolvedCount = imps.filter((i) => i.resolved).length;
          const openCount = imps.length - resolvedCount;
          return (
          <Card key={e.id} className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{format(parseISO(e.entry_date), "PPP", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {imps.length > 0 && openCount === 0 && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Tudo sanado
                    </Badge>
                  )}
                  {openCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                      {openCount} em aberto
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(e)}
                    title="Editar daily"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Badge variant="outline" className="text-[10px]">{format(parseISO(e.created_at), "dd/MM HH:mm")}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Ontem */}
                <div className="rounded-xl border bg-muted/30 p-3 flex flex-col">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">Ontem</p>
                  <p className="text-sm whitespace-pre-wrap break-words flex-1">{e.did_yesterday || <span className="text-muted-foreground">—</span>}</p>
                </div>
                {/* Hoje */}
                <div className="rounded-xl border bg-primary/5 p-3 flex flex-col">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80 mb-1.5">Hoje</p>
                  <p className="text-sm whitespace-pre-wrap break-words flex-1">{e.will_do_today || <span className="text-muted-foreground">—</span>}</p>
                </div>
                {/* Impedimentos */}
                <div className="rounded-xl border bg-orange-500/5 p-3 flex flex-col">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-orange-600 mb-1.5 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> Impedimentos
                  </p>
                  {imps.length === 0 && !e.impediments?.trim() && (
                    <p className="text-sm text-muted-foreground flex-1">—</p>
                  )}
                  {e.impediments?.trim() && imps.length === 0 && (
                    <p className="text-sm whitespace-pre-wrap break-words flex-1">{e.impediments}</p>
                  )}
                  {imps.length > 0 && (
                    <div className="space-y-1.5 flex-1">
                      {imps.map((imp) => (
                        <div key={imp.id} className="rounded-lg border bg-background/70 p-2 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${URGENCY_STYLES[imp.urgency]}`}>
                              {URGENCY_LABELS[imp.urgency]}
                            </Badge>
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-5 h-5 text-primary" />
              Registrar daily
              {existing && <Badge variant="outline" className="ml-2">Editando</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de referência</Label>
              <Select value={date} onValueChange={setDate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dateOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">O que fiz ontem? <span className="text-orange-500">*</span></Label>
              <Textarea
                rows={4}
                value={didYesterday}
                onChange={(e) => { setDidYesterday(e.target.value); setTouched((p) => ({ ...p, did: true })); }}
                placeholder="Tarefas, entregas, descobertas..."
                className={touched.did && didEmpty ? "border-orange-500 focus-visible:ring-orange-500" : ""}
              />
              {touched.did && didEmpty && <p className="text-xs text-orange-500 mt-1">Campo obrigatório.</p>}
            </div>

            <div>
              <Label className="mb-1.5">O que farei hoje? <span className="text-orange-500">*</span></Label>
              <Textarea
                rows={4}
                value={willDoToday}
                onChange={(e) => { setWillDoToday(e.target.value); setTouched((p) => ({ ...p, will: true })); }}
                placeholder="Próximos passos planejados..."
                className={touched.will && willEmpty ? "border-orange-500 focus-visible:ring-orange-500" : ""}
              />
              {touched.will && willEmpty && <p className="text-xs text-orange-500 mt-1">Campo obrigatório.</p>}
            </div>

            {/* Resolução de impedimentos anteriores em aberto */}
            {priorOpen.length > 0 && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <AlertOctagon className="w-4 h-4 text-orange-500" />
                  Impedimentos anteriores em aberto
                  <span className="text-xs text-muted-foreground font-normal">
                    (sinalize cada um antes de salvar)
                  </span>
                </Label>
                {priorOpen.map((p) => {
                  const r = priorRes[p.id] ?? { resolved: null };
                  const entry = entries.find((e) => e.id === p.entry_id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${URGENCY_STYLES[p.urgency]}`}>
                        {URGENCY_LABELS[p.urgency]}
                      </Badge>
                      {entry && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {format(parseISO(entry.entry_date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                      <p className="text-sm flex-1 min-w-0 truncate" title={p.description}>{p.description}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant={r.resolved === true ? "default" : "outline"}
                          className="rounded-lg gap-1.5 h-8"
                          onClick={() => setPriorRes((prev) => ({ ...prev, [p.id]: { resolved: true } }))}
                        >
                          <CircleCheck className="w-3.5 h-3.5" /> Sanado
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={r.resolved === false ? "destructive" : "outline"}
                          className="rounded-lg gap-1.5 h-8"
                          onClick={() => setPriorRes((prev) => ({ ...prev, [p.id]: { resolved: false } }))}
                        >
                          <CircleDot className="w-3.5 h-3.5" /> Ainda impedido
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Novos impedimentos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Impedimentos <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>

              {/* Impedimentos já persistidos nesta entry (somente leitura para edição) */}
              {existingImps.length > 0 && (
                <div className="space-y-2">
                  {existingImps.map((imp) => (
                    <div key={imp.id} className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5">
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${URGENCY_STYLES[imp.urgency]}`}>
                        {URGENCY_LABELS[imp.urgency]}
                      </Badge>
                      <p className="text-sm flex-1 whitespace-pre-wrap break-words">{imp.description}</p>
                      {imp.resolved ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
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
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Drafts adicionados nesta sessão */}
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
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form para adicionar novo */}
              {!showNewImp ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewImp(true)}
                  className="rounded-xl gap-1.5"
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
                    <Button
                      type="button"
                      onClick={addDraftImpediment}
                      className="rounded-xl gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setShowNewImp(false); setNewDesc(""); setNewUrg(null); }}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={submit} disabled={upsert.isPending} className="rounded-xl gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {existing ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
