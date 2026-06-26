import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck, AlertOctagon, Sparkles, TrendingUp, AlertTriangle, Flame,
  CheckCircle2, History, Users, Loader2,
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
  created_at: string;
}

interface DayGroup {
  date: string;
  entries: DevEntryRow[];
}

export default function HistoricoPage() {
  const { current: sim } = useDailySim();
  const { data: profiles = [] } = useProfiles();
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);

  // Resolve os user_ids visíveis: GP vê apenas membros das suas squads;
  // Diretor vê todos os user_ids que registraram dailys.
  const squadIds = sim.role === "gp" ? (sim.squadIds ?? []) : null;

  const { data: allowedUserIds = null } = useQuery<string[] | null>({
    queryKey: ["historico_allowed_users", sim.role, (squadIds ?? []).slice().sort().join(",")],
    enabled: sim.role === "diretor" || (squadIds !== null && squadIds.length > 0),
    queryFn: async () => {
      if (sim.role === "diretor") return null; // null = sem filtro
      if (!squadIds || squadIds.length === 0) return [];
      const { data: sm } = await (supabase.from("squad_members") as any)
        .select("team_member_id")
        .in("squad_id", squadIds);
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

  const { data: entries = [], isLoading } = useQuery<DevEntryRow[]>({
    queryKey: ["historico_dev_entries", sim.role, (allowedUserIds ?? ["__all__"]).slice().sort().join(",")],
    enabled: sim.role === "diretor" || (Array.isArray(allowedUserIds) && allowedUserIds.length > 0),
    queryFn: async () => {
      let q = (supabase.from("dev_daily_entries") as any)
        .select("*")
        .order("entry_date", { ascending: false });
      if (sim.role !== "diretor" && allowedUserIds && allowedUserIds.length > 0) {
        q = q.in("user_id", allowedUserIds);
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
  const impCountByEntry = useMemo(() => {
    const m = new Map<string, number>();
    allImps.forEach((i) => {
      if (i.resolved) return;
      m.set(i.entry_id, (m.get(i.entry_id) ?? 0) + 1);
    });
    return m;
  }, [allImps]);

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
          const totalImps = day.entries.reduce((acc, e) => acc + (impCountByEntry.get(e.id) ?? 0), 0);
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
): { summary: string; members: string[] } {
  const parts: string[] = [];
  const members: string[] = [];
  day.entries.forEach((e) => {
    const name = nameFor(e.user_id);
    members.push(name);
    const imps = (impsByEntry.get(e.id) ?? []).map((i) =>
      `- ${i.description} (urgência ${i.urgency}${i.resolved ? ", resolvido" : ""})`,
    );
    parts.push(
      `=== ${name} ===\n` +
        `Ontem: ${e.did_yesterday?.trim() || "—"}\n` +
        `Hoje: ${e.will_do_today?.trim() || "—"}\n` +
        `Impedimentos: ${imps.length ? "\n" + imps.join("\n") : "—"}`,
    );
  });
  return { summary: parts.join("\n\n"), members };
}

function DayDetailDialog({
  day,
  onClose,
  nameFor,
  impediments,
}: {
  day: DayGroup | null;
  onClose: () => void;
  nameFor: (uid: string) => string;
  impediments: { id: string; entry_id: string; description: string; urgency: string; resolved: boolean }[];
}) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const impsByEntry = useMemo(() => {
    const m = new Map<string, typeof impediments>();
    impediments.forEach((i) => {
      const list = m.get(i.entry_id) ?? [];
      list.push(i);
      m.set(i.entry_id, list);
    });
    return m;
  }, [impediments]);

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
      const { summary, members } = buildSummaryForAI(day, nameFor, impsByEntry as any);
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
                  <Users className="h-3 w-3" /> {day.entries.length} {day.entries.length === 1 ? "desenvolvedor" : "desenvolvedores"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {format(parseISO(day.date), "EEEE", { locale: ptBR })}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="bruto" className="flex-1 flex flex-col min-h-0">
              <TabsList className="self-start">
                <TabsTrigger value="bruto">Relatório Bruto</TabsTrigger>
                <TabsTrigger value="ia">Análise da IA</TabsTrigger>
              </TabsList>
              <TabsContent value="bruto" className="flex-1 min-h-0">
                <ScrollArea className="h-[60vh] pr-3">
                  <div className="space-y-2.5">
                    {day.entries.map((e) => {
                      const name = nameFor(e.user_id);
                      const imps = impsByEntry.get(e.id) ?? [];
                      return (
                        <Card key={e.id} className="border-l-4 border-l-primary/60 bg-card/40">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-primary/15 text-primary">
                                {initials(name)}
                              </div>
                              <CardTitle className="text-sm">{name}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2.5">
                            <Section label="Ontem" text={e.did_yesterday} />
                            <Section label="Hoje" text={e.will_do_today} />
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
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