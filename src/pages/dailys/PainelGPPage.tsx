import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, CheckCircle2, Clock, Users, RefreshCcw, AlertOctagon, CircleCheck, Eye, Calendar } from "lucide-react";
import { History, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSquads } from "@/hooks/useSquads";
import { useDevDailyEntriesByDate } from "@/hooks/useDevDailyEntries";
import { useDevDailyImpedimentsByEntries, URGENCY_LABELS, URGENCY_STYLES } from "@/hooks/useDevDailyImpediments";
import { useGenerateDailyInsights, type DailyInsight } from "@/hooks/useDailyInsights";
import { useProfiles } from "@/hooks/useProfiles";
import { IniciarDailyModal } from "@/components/dailys/IniciarDailyModal";
import HistoricoPage from "./HistoricoPage";
import SaudePage from "./SaudePage";
import { useDailySim } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function PainelGPPage() {
  const { current: sim } = useDailySim();
  const [date, setDate] = useState<string>(todayISO());
  const [squadId, setSquadId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [insights, setInsights] = useState<DailyInsight[]>([]);

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

  // Para mostrar impedimentos visíveis no dia D (criados <= D, ainda em aberto
  // ou sanados >= D), precisamos de TODAS as entries dos mesmos usuários até D.
  const userIds = useMemo(() => Array.from(new Set(entries.map((e) => e.user_id))), [entries]);
  const { data: userEntries = [] } = useQuery({
    queryKey: ["dev_daily_entries", "by-users-upto", date, userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any)
        .select("id,user_id,entry_date")
        .in("user_id", userIds)
        .lte("entry_date", date);
      if (error) throw error;
      return (data ?? []) as { id: string; user_id: string; entry_date: string }[];
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

  const rows = useMemo(() => {
    return entries.map(e => {
      const p = profileByUser.get(e.user_id);
      const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : e.user_id;
      const imps = impsByUser.get(e.user_id) ?? [];
      return { ...e, dev_name: name, imps };
    });
  }, [entries, profileByUser, impsByUser]);

  const detailRow = useMemo(() => rows.find((r) => r.id === detailEntryId) ?? null, [rows, detailEntryId]);

  const handleGenerate = async () => {
    const result = await gen.mutateAsync(rows.map(r => ({
      dev_name: r.dev_name,
      did_yesterday: r.did_yesterday ?? "",
      will_do_today: r.will_do_today ?? "",
      impediments: r.impediments ?? "",
    })));
    setInsights(result);
  };

  if (sim.role === "dev") {
    return (
      <AccessDeniedCard message="Desenvolvedores não têm acesso ao Painel do GP. Selecione um perfil de GP ou Diretor no seletor acima." />
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Painel do Analista / GP
            {sim.role === "gp" && sim.personName && <span className="text-base font-normal text-muted-foreground ml-2">— {sim.personName}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sim.role === "diretor"
              ? "Visão consolidada de todas as squads."
              : "Você só vê as squads onde está cadastrado como responsável."}
          </p>
        </div>
      </div>

      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="painel" className="gap-2"><Sparkles className="w-4 h-4" /> Painel</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><History className="w-4 h-4" /> Histórico</TabsTrigger>
          <TabsTrigger value="saude" className="gap-2"><Activity className="w-4 h-4" /> Saúde & Engajamento</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-0">
        <div className="flex items-end gap-3 flex-wrap mb-4 justify-end">
          <div>
            <Label className="mb-1.5">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />
          </div>
          <div>
            <Label className="mb-1.5">Squad</Label>
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
          <Button onClick={() => setOpenModal(true)} className="rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Play className="w-4 h-4" /> Iniciar Daily
          </Button>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs text-muted-foreground">Devs preencheram</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div><div className="text-2xl font-bold">{rows.filter(r => r.imps.length > 0).length}</div><div className="text-xs text-muted-foreground">Com impedimento</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div><div className="text-2xl font-bold">{insights.length}</div><div className="text-xs text-muted-foreground">Insights de IA gerados</div></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Status de preenchimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro para a data.</p>}
            {rows.map(r => {
              const openCount = r.imps.filter(i => !i.resolved).length;
              const resolvedToday = r.imps.filter(i => i.resolved && i.resolved_at?.slice(0, 10) === date).length;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDetailEntryId(r.id)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-surface-hover/40 hover:bg-surface-hover transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.dev_name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{r.will_do_today || "Sem plano informado"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.imps.length > 0 && (
                      <Badge variant="outline" className="border-orange-500/40 text-orange-600 gap-1">
                        <AlertOctagon className="w-3 h-3" />
                        {r.imps.length} impediment{r.imps.length !== 1 ? "os" : "o"}
                      </Badge>
                    )}
                    {openCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                        {openCount} em aberto
                      </Badge>
                    )}
                    {resolvedToday > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                        <CircleCheck className="w-2.5 h-2.5" /> {resolvedToday} sanado{resolvedToday !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Badge className="bg-emerald-500/15 text-emerald-600">Preencheu</Badge>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Insights da IA</CardTitle>
            <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={handleGenerate} disabled={gen.isPending || rows.length === 0}>
              <RefreshCcw className={`w-3.5 h-3.5 ${gen.isPending ? "animate-spin" : ""}`} />
              {insights.length ? "Regenerar" : "Gerar perguntas"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-muted-foreground">Clique em <b>Gerar perguntas</b> para receber sugestões para cada dev.</p>
            )}
            {insights.map((it, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 bg-card">
                <div className="text-sm font-semibold mb-1.5">{it.dev_name}</div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {it.suggested_questions.map((q, j) => <li key={j}>{q}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <HistoricoPage />
        </TabsContent>

        <TabsContent value="saude" className="mt-0">
          <SaudePage />
        </TabsContent>
      </Tabs>

      <IniciarDailyModal
        open={openModal}
        onOpenChange={setOpenModal}
        date={date}
        squadId={effectiveSquadId}
        entries={rows}
      />

      <Dialog open={!!detailEntryId} onOpenChange={(o) => !o && setDetailEntryId(null)}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {detailRow?.dev_name} — {format(parseISO(date), "PPP", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">Ontem</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{detailRow.did_yesterday || <span className="text-muted-foreground">—</span>}</p>
                </div>
                <div className="rounded-xl border bg-primary/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80 mb-1.5">Hoje</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{detailRow.will_do_today || <span className="text-muted-foreground">—</span>}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-orange-500/5 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-orange-600 mb-2 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> Impedimentos
                </p>
                {detailRow.imps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum impedimento registrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailRow.imps.map((imp) => {
                      const origin = userEntries.find((e) => e.id === imp.entry_id);
                      const createdBadge = origin && origin.entry_date !== date ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                          Criado em {format(parseISO(origin.entry_date), "dd/MM", { locale: ptBR })}
                        </Badge>
                      ) : null;
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
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailEntryId(null)} className="rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
