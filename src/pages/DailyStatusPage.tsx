import { useMemo, useRef, useState } from "react";
import { format, differenceInCalendarDays, differenceInHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck, Plus, TrendingUp, AlertTriangle, Flame, Sparkles, Activity,
  Smile, Frown, Meh, Heart, Loader2, ListChecks, CheckCircle2, UserMinus, UserPlus,
  Link2, Target, ShieldAlert, History, Pencil, Lock, GitBranch, BarChart3,
  UsersRound, Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { useAuth } from "@/contexts/AuthContext";
import { NewDailyDialog } from "@/components/daily/NewDailyDialog";
import { EditDailyDialog } from "@/components/daily/EditDailyDialog";
import { downloadDailyReportPdf, parseRawReport } from "@/lib/dailyReportPdf";

interface AIRecorrencia { descricao: string; dias_consecutivos: number; responsavel?: string; }
interface AIOcioso { nome: string; motivo: string; }
interface AISobrecarregado { nome: string; motivo: string; nivel_risco: "baixo" | "medio" | "alto"; }
interface AIDependencia { item: string; bloqueador: string; tipo: "externo" | "interno"; }
interface AIInsights {
  avancos: string[];
  riscos: string[];
  recorrencias: AIRecorrencia[];
  status_geral: "saudavel" | "atencao" | "critico";
  resumo_executivo: string;
  resumo_curto?: string;
  vibe_equipe?: "motivada" | "neutra" | "desgastada" | "frustrada";
  proximos_passos?: string[];
  colaboradores_ociosos?: AIOcioso[];
  colaboradores_sobrecarregados?: AISobrecarregado[];
  dependencias_externas?: AIDependencia[];
  avancos_consolidados?: string[];
  prospeccao_riscos?: string[];
}

interface DailyRow {
  id: string;
  product_id: string;
  sprint_id: string;
  sprint_label?: string;
  status_date: string;
  present_member_ids: string[];
  summary: string;
  blocker_level: number;
  ai_insights: AIInsights | null;
  created_at: string;
}

const VIBE_MAP: Record<NonNullable<AIInsights["vibe_equipe"]>, { label: string; icon: any; cls: string }> = {
  motivada: { label: "Motivada", icon: Heart, cls: "text-emerald-600 bg-emerald-500/15 border-emerald-500/30" },
  neutra: { label: "Neutra", icon: Meh, cls: "text-slate-600 bg-slate-500/15 border-slate-500/30" },
  desgastada: { label: "Desgastada", icon: Frown, cls: "text-amber-600 bg-amber-500/15 border-amber-500/30" },
  frustrada: { label: "Frustrada", icon: Frown, cls: "text-red-600 bg-red-500/15 border-red-500/30" },
};

const RISK_CLS: Record<AISobrecarregado["nivel_risco"], string> = {
  baixo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  medio: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  alto: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function DailyStatusPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { data: allProducts = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const { isAdmin, productIds: allowedIds } = useAuthorizedProducts();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDaily, setSelectedDaily] = useState<DailyRow | null>(null);
  const [editingDaily, setEditingDaily] = useState<DailyRow | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string>("all");

  // Produtos autorizados
  const products = useMemo(
    () => isAdmin || !allowedIds ? allProducts : allProducts.filter((p) => allowedIds.includes(p.id)),
    [allProducts, allowedIds, isAdmin],
  );
  const viewProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const productNameMap = useMemo(() => Object.fromEntries(allProducts.map((p) => [p.id, p.name])), [allProducts]);
  const productColorMap = useMemo(() => Object.fromEntries(allProducts.map((p) => [p.id, p.color])), [allProducts]);

  // Membros: squads onde o usuário é líder OU squads que compartilham produto autorizado
  const myProfileId = useMemo(
    () => profiles.find((p) => p.user_id === user?.id)?.id ?? null,
    [profiles, user?.id],
  );
  const squadMemberIds = useMemo(() => {
    const ids = new Set<string>();
    const allowed = allowedIds ? new Set(allowedIds) : null;
    squads.forEach((s) => {
      const isLeader = !!myProfileId && s.leader_profile_id === myProfileId;
      const sharesProduct = isAdmin || !allowed || s.product_ids.some((pid) => allowed.has(pid));
      if (isLeader || sharesProduct) s.member_ids.forEach((id) => ids.add(id));
    });
    return ids;
  }, [squads, myProfileId, isAdmin, allowedIds]);

  const { data: allDailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_all_agg", isAdmin ? "admin" : viewProductIds.join(",")],
    enabled: viewProductIds.length > 0 || isAdmin,
    queryFn: async () => {
      let q = (supabase.from("daily_status") as any)
        .select("*")
        .order("status_date", { ascending: false });
      if (!isAdmin) {
        if (viewProductIds.length === 0) return [] as DailyRow[];
        q = q.in("product_id", viewProductIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const sprintsWithDailies = useMemo(() => {
    const ids = new Set(allDailies.map((d) => d.sprint_id).filter(Boolean));
    return sprints.filter((s) => ids.has(s.id));
  }, [allDailies, sprints]);

  const dailies = useMemo(() => {
    if (sprintFilter === "all") return allDailies;
    return allDailies.filter((d) => d.sprint_id === sprintFilter);
  }, [allDailies, sprintFilter]);

  const sprintNameMap = Object.fromEntries(sprints.map((s) => [s.id, s.name]));
  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  const dailyNumberMap = useMemo(() => {
    const sortedAsc = [...dailies].sort((a, b) => a.status_date.localeCompare(b.status_date));
    const map: Record<string, number> = {};
    sortedAsc.forEach((d, i) => { map[d.id] = i + 1; });
    return map;
  }, [dailies]);

  const latest = dailies[0];
  const latestInsights = latest?.ai_insights;

  // Sprints dos produtos autorizados
  const productSprints = useMemo(
    () => sprints.filter((s) => viewProductIds.includes(s.product_id ?? "")),
    [sprints, viewProductIds],
  );

  // Sprint atual: a mais recente ativa em qualquer projeto autorizado
  const currentSprint = useMemo(() => {
    if (!productSprints.length) return null;
    const today = format(new Date(), "yyyy-MM-dd");
    const active = productSprints.find((s) => ["active", "in_progress"].includes(s.status));
    if (active) return active;
    const inRange = productSprints.find((s) => s.start_date <= today && today <= s.end_date);
    if (inRange) return inRange;
    return [...productSprints].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;
  }, [productSprints]);

  const currentSprintStats = useMemo(() => {
    if (!currentSprint) return { avancos: 0, gargalos: 0, dailies: 0 };
    const ds = allDailies.filter((d) => d.sprint_id === currentSprint.id);
    const avancos = ds.reduce((s, d) => s + (d.ai_insights?.avancos?.length ?? 0) + (d.ai_insights?.avancos_consolidados?.length ?? 0), 0);
    const gargalos = ds.reduce((s, d) => s + (d.ai_insights?.recorrencias?.length ?? 0), 0);
    return { avancos, gargalos, dailies: ds.length };
  }, [currentSprint, allDailies]);

  // Status agregado: derivado dos status dos produtos autorizados
  const aggregateStatus = useMemo(() => {
    const counts = { active: 0, paused: 0, inactive: 0 } as Record<string, number>;
    products.forEach((p) => { counts[p.status ?? "active"] = (counts[p.status ?? "active"] ?? 0) + 1; });
    if (products.length === 1) {
      const meta: Record<string, { label: string; cls: string }> = {
        active: { label: "Ativo", cls: "text-emerald-600" },
        paused: { label: "Em Pausa", cls: "text-amber-600" },
        inactive: { label: "Concluído", cls: "text-muted-foreground" },
      };
      const s = products[0].status ?? "active";
      return { label: meta[s]?.label ?? s, cls: meta[s]?.cls ?? "" };
    }
    return { label: `${counts.active ?? 0} ativos`, cls: "text-emerald-600" };
  }, [products]);

  // Dashboard executivo agregado
  const exec = useMemo(() => {
    if (!dailies.length) return null;
    const avgBlocker = dailies.reduce((s, d) => s + d.blocker_level, 0) / dailies.length;

    const bottleneckMap = new Map<string, { descricao: string; ocorrencias: number; maxDias: number }>();
    for (const d of dailies) {
      for (const r of d.ai_insights?.recorrencias ?? []) {
        const key = r.descricao.toLowerCase().trim();
        const cur = bottleneckMap.get(key);
        if (cur) { cur.ocorrencias += 1; cur.maxDias = Math.max(cur.maxDias, r.dias_consecutivos); }
        else bottleneckMap.set(key, { descricao: r.descricao, ocorrencias: 1, maxDias: r.dias_consecutivos });
      }
    }
    const historicoGargalos = Array.from(bottleneckMap.values()).sort((a, b) => b.ocorrencias - a.ocorrencias);

    const idleMap = new Map<string, { nome: string; vezes: number; datas: string[] }>();
    for (const d of dailies) {
      for (const o of d.ai_insights?.colaboradores_ociosos ?? []) {
        const k = o.nome.toLowerCase().trim();
        const cur = idleMap.get(k);
        if (cur) { cur.vezes += 1; cur.datas.push(d.status_date); }
        else idleMap.set(k, { nome: o.nome, vezes: 1, datas: [d.status_date] });
      }
    }
    const ociosos = Array.from(idleMap.values()).sort((a, b) => b.vezes - a.vezes);

    const overMap = new Map<string, { nome: string; vezes: number; datas: string[]; nivel_risco: AISobrecarregado["nivel_risco"] }>();
    const riskRank: Record<AISobrecarregado["nivel_risco"], number> = { baixo: 1, medio: 2, alto: 3 };
    for (const d of dailies) {
      for (const s of d.ai_insights?.colaboradores_sobrecarregados ?? []) {
        const k = s.nome.toLowerCase().trim();
        const cur = overMap.get(k);
        if (cur) {
          cur.vezes += 1; cur.datas.push(d.status_date);
          if (riskRank[s.nivel_risco] > riskRank[cur.nivel_risco]) cur.nivel_risco = s.nivel_risco;
        } else overMap.set(k, { nome: s.nome, vezes: 1, datas: [d.status_date], nivel_risco: s.nivel_risco });
      }
    }
    const sobrecarregados = Array.from(overMap.values()).sort((a, b) => riskRank[b.nivel_risco] - riskRank[a.nivel_risco] || b.vezes - a.vezes);

    const dependenciasExternas = (latestInsights?.dependencias_externas ?? []).filter((d) => d.tipo === "externo");

    const chrono = [...dailies].reverse();
    const lifespan = new Map<string, { first: string; last: string }>();
    for (const d of chrono) {
      for (const r of d.ai_insights?.recorrencias ?? []) {
        const key = r.descricao.toLowerCase().trim();
        const cur = lifespan.get(key);
        if (cur) cur.last = d.status_date;
        else lifespan.set(key, { first: d.status_date, last: d.status_date });
      }
    }
    const lifespans = Array.from(lifespan.values()).map((v) => differenceInCalendarDays(new Date(v.last), new Date(v.first)) + 1);
    const eficienciaDesbloqueio = lifespans.length ? lifespans.reduce((a, b) => a + b, 0) / lifespans.length : null;

    return {
      avgBlocker, total: dailies.length,
      latestDate: latest?.status_date,
      historicoGargalos, ociosos, sobrecarregados, dependenciasExternas, eficienciaDesbloqueio,
    };
  }, [dailies, latest, latestInsights]);

  const canEdit = (d: DailyRow) => differenceInHours(new Date(), new Date(d.created_at)) <= 72;

  const handleDownloadDaily = (d: DailyRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    downloadDailyReportPdf({
      productName: productNameMap[d.product_id] ?? "Projeto",
      dailyNumber: dailyNumberMap[d.id] ?? 0,
      statusDate: d.status_date,
      sprintLabel: d.sprint_label?.trim() || (sprintNameMap[d.sprint_id] ?? "—"),
      blockerLevel: d.blocker_level,
      presentMembers: (d.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id),
      rawSummary: d.summary ?? "",
      insights: d.ai_insights,
    });
  };

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6 max-w-7xl mx-auto"}>
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Registro de Dailys</h1>
              <p className="text-sm text-muted-foreground">Visão consolidada de todos os seus projetos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Filtrar sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Geral (todas)</SelectItem>
                {sprintsWithDailies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.product_id ? ` · ${productNameMap[s.product_id] ?? ""}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {/* MINI DASHBOARD HORIZONTAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <MiniStat icon={UsersRound} label="Membros" value={squadMemberIds.size} />
        <MiniStat icon={CalendarCheck} label="Dailys" value={allDailies.length} />
        <MiniStat icon={GitBranch} label="Sprints" value={productSprints.length} />
        <MiniStat icon={Target} label="Sprint Atual" value={currentSprint?.name ?? "—"} valueClass="text-sm" />
        <MiniStat icon={TrendingUp} label="Avanços (atual)" value={currentSprintStats.avancos} valueClass="text-emerald-600" />
        <MiniStat icon={Flame} label="Gargalos (atual)" value={currentSprintStats.gargalos} valueClass="text-red-600" />
        <MiniStat icon={Activity} label="Status" value={aggregateStatus.label} valueClass={cn("text-sm", aggregateStatus.cls)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="text-muted-foreground">Nenhum projeto vinculado ao seu usuário.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="historico" className="space-y-4">
          <TabsList>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="executivo">Dashboard Executivo</TabsTrigger>
          </TabsList>

          {/* HISTÓRICO */}
          <TabsContent value="historico" className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {sprintFilter === "all"
                  ? `Mostrando todas as ${dailies.length} daily(s).`
                  : `Mostrando ${dailies.length} daily(s) da ${sprintNameMap[sprintFilter] ?? "sprint"}.`}
              </p>
              <Button onClick={() => setOpenDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Nova Daily
              </Button>
            </div>
            {dailies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma daily registrada {sprintFilter === "all" ? "." : "nesta sprint."}
                </CardContent>
              </Card>
            ) : dailies.map((d) => {
              const resumo = d.ai_insights?.resumo_curto ?? d.ai_insights?.resumo_executivo ?? d.summary;
              const num = dailyNumberMap[d.id];
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card
                    onClick={() => setSelectedDaily(d)}
                    className="cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                  >
                    <CardContent className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge className="flex-shrink-0 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                          Daily #{num}
                        </Badge>
                        <Badge variant="outline" className="flex-shrink-0">
                          {format(parseISO(d.status_date), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                        <Badge variant="outline" className="flex-shrink-0 text-[10px] gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: productColorMap[d.product_id] ?? "hsl(var(--primary))" }} />
                          {productNameMap[d.product_id] ?? "Projeto"}
                        </Badge>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {d.sprint_label?.trim() ? d.sprint_label : (sprintNameMap[d.sprint_id] ?? "Sprint —")}
                        </Badge>
                        <p className="text-sm text-muted-foreground truncate italic">"{resumo}"</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">Bloqueio {d.blocker_level}/5</Badge>
                        <Button
                          size="icon" variant="ghost"
                          title="Baixar relatório PDF desta daily"
                          onClick={(e) => handleDownloadDaily(d, e)}
                          className="h-8 w-8"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* DASHBOARD EXECUTIVO */}
          <TabsContent value="executivo" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><CalendarCheck className="h-4 w-4" /></div>
                    <CardTitle className="text-sm">Dailys Registradas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{exec?.total ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Última: {latest && format(parseISO(latest.status_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Activity className="h-4 w-4" /></div>
                    <CardTitle className="text-sm">Bloqueio Médio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{exec?.avgBlocker.toFixed(1) ?? "—"}<span className="text-base text-muted-foreground">/5</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Média histórica</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><History className="h-4 w-4" /></div>
                    <CardTitle className="text-sm">Eficiência Desbloqueio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {exec?.eficienciaDesbloqueio != null ? `${exec.eficienciaDesbloqueio.toFixed(1)}d` : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tempo médio de gargalo</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Smile className="h-4 w-4" /></div>
                    <CardTitle className="text-sm">Vibe da Equipe</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {latestInsights?.vibe_equipe ? (() => {
                    const v = VIBE_MAP[latestInsights.vibe_equipe];
                    const Icon = v.icon;
                    return (
                      <Badge className={cn("border text-sm gap-1.5 py-1.5 px-3", v.cls)}>
                        <Icon className="h-4 w-4" /> {v.label}
                      </Badge>
                    );
                  })() : <p className="text-sm text-muted-foreground">Sem leitura</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-500/15 text-red-600"><Flame className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Gargalos Atuais</CardTitle>
                  </div>
                  <CardDescription>Recorrências da última daily</CardDescription>
                </CardHeader>
                <CardContent>
                  {!latestInsights?.recorrencias?.length ? (
                    <p className="text-sm text-muted-foreground">Nenhum gargalo ativo.</p>
                  ) : (
                    <ul className="space-y-2">
                      {latestInsights.recorrencias.map((r, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 p-2 rounded-md bg-background/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{r.descricao}</p>
                            {r.responsavel && <p className="text-xs text-muted-foreground">Responsável: {r.responsavel}</p>}
                          </div>
                          <Badge variant="destructive" className="flex-shrink-0">{r.dias_consecutivos}º dia</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600"><History className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Histórico de Gargalos</CardTitle>
                  </div>
                  <CardDescription>Mais frequentes no período</CardDescription>
                </CardHeader>
                <CardContent>
                  {!exec?.historicoGargalos.length ? (
                    <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
                  ) : (
                    <ul className="space-y-2">
                      {exec.historicoGargalos.slice(0, 6).map((g, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/30">
                          <p className="text-sm">{g.descricao}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">{g.ocorrencias}x</Badge>
                            <Badge variant="outline" className="text-xs">máx {g.maxDias}d</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600"><UserMinus className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Colaboradores Ociosos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!exec?.ociosos.length ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador identificado como ocioso.</p>
                  ) : (
                    <ul className="space-y-2">
                      {exec.ociosos.map((o, i) => (
                        <li key={i} className="p-2 rounded-md bg-background/50 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{o.nome}</span>
                            <Badge variant="secondary" className="text-xs">{o.vezes}x ocioso</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Datas: {o.datas.map((d) => format(parseISO(d), "dd/MM", { locale: ptBR })).join(", ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/15 text-orange-600"><UserPlus className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Colaboradores Sobrecarregados</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!exec?.sobrecarregados.length ? (
                    <p className="text-sm text-muted-foreground">Nenhum sinal de sobrecarga.</p>
                  ) : (
                    <ul className="space-y-2">
                      {exec.sobrecarregados.map((s, i) => (
                        <li key={i} className="p-2 rounded-md bg-background/50 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{s.nome}</span>
                            <div className="flex gap-1">
                              <Badge className={cn("border text-xs", RISK_CLS[s.nivel_risco])}>Risco {s.nivel_risco}</Badge>
                              <Badge variant="secondary" className="text-xs">{s.vezes}x</Badge>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600"><Target className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Avanços Consolidados</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!latestInsights?.avancos_consolidados?.length ? (
                    <p className="text-sm text-muted-foreground">Nenhum marco consolidado ainda.</p>
                  ) : (
                    <ul className="space-y-2">
                      {latestInsights.avancos_consolidados.map((a, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600"><ShieldAlert className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Prospecção de Riscos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!latestInsights?.prospeccao_riscos?.length ? (
                    <p className="text-sm text-muted-foreground">Sem riscos prospectados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {latestInsights.prospeccao_riscos.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Link2 className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Dependências Externas</CardTitle>
                </div>
                <CardDescription>Itens travados por agentes fora do time</CardDescription>
              </CardHeader>
              <CardContent>
                {!exec?.dependenciasExternas.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma dependência externa registrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {exec.dependenciasExternas.map((d, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                        <span className="text-sm">{d.item}</span>
                        <Badge variant="outline" className="text-xs">Aguardando {d.bloqueador}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><ListChecks className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Próximos Passos Sugeridos pela IA</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {latestInsights?.proximos_passos?.length ? (
                  <ul className="space-y-2">
                    {latestInsights.proximos_passos.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível ainda.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <NewDailyDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        allowedProductIds={isAdmin ? undefined : viewProductIds}
      />
      <EditDailyDialog open={!!editingDaily} onOpenChange={(o) => !o && setEditingDaily(null)} daily={editingDaily} onSaved={() => setSelectedDaily(null)} />

      {/* Modal de detalhe da daily */}
      <Dialog open={!!selectedDaily} onOpenChange={(o) => !o && setSelectedDaily(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          {selectedDaily && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      Daily #{dailyNumberMap[selectedDaily.id]} —{" "}
                      {format(parseISO(selectedDaily.status_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadDaily(selectedDaily)}>
                      <Download className="h-4 w-4 mr-2" /> Baixar PDF
                    </Button>
                    {canEdit(selectedDaily) ? (
                      <Button size="sm" variant="outline" onClick={() => setEditingDaily(selectedDaily)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                    ) : (
                      <Badge variant="outline" className="gap-1.5">
                        <Lock className="h-3 w-3" /> Somente leitura
                      </Badge>
                    )}
                  </div>
                </div>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: productColorMap[selectedDaily.product_id] ?? "hsl(var(--primary))" }} />
                    {productNameMap[selectedDaily.product_id] ?? "Projeto"}
                  </Badge>
                  <Badge variant="secondary">{sprintNameMap[selectedDaily.sprint_id] ?? "Sprint —"}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Bloqueio IA {selectedDaily.blocker_level}/5
                  </Badge>
                  {(selectedDaily.present_member_ids ?? []).length > 0 && (
                    <span className="text-xs">{(selectedDaily.present_member_ids ?? []).length} membro(s) presente(s)</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · Criada em {format(new Date(selectedDaily.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="bruto" className="flex-1 flex flex-col min-h-0">
                <TabsList className="self-start">
                  <TabsTrigger value="bruto">Relatório Bruto</TabsTrigger>
                  <TabsTrigger value="ia">Análise da IA</TabsTrigger>
                </TabsList>
                <TabsContent value="bruto" className="flex-1 min-h-0">
                  <ScrollArea className="h-[55vh] pr-3">
                    <RawReportView
                      summary={selectedDaily.summary}
                      presentMembers={(selectedDaily.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id)}
                    />
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="ia" className="flex-1 min-h-0">
                  <ScrollArea className="h-[55vh] pr-3">
                    {!selectedDaily.ai_insights ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Esta daily não possui análise de IA.</p>
                    ) : (
                      <DailyAIDetail insights={selectedDaily.ai_insights} />
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
        <div className={`text-lg font-bold tabular-nums truncate ${valueClass ?? ""}`}>{value}</div>
      </div>
    </div>
  );
}

function RawReportView({ summary, presentMembers }: { summary: string; presentMembers: string[] }) {
  const blocks = parseRawReport(summary || "");
  const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (!summary?.trim()) return <p className="text-sm text-muted-foreground italic">Sem texto registrado.</p>;
  return (
    <div className="space-y-3">
      {presentMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presentMembers.map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}
        </div>
      )}
      <div className="space-y-2.5">
        {blocks.map((b, i) => {
          const isMeta = /observa|coordena/i.test(b.name);
          return (
            <Card key={i} className={cn("border-l-4", isMeta ? "border-l-amber-500/60 bg-amber-500/5" : "border-l-primary/60 bg-card/40")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                    isMeta ? "bg-amber-500/20 text-amber-700" : "bg-primary/15 text-primary")}>
                    {isMeta ? "📝" : initials(b.name)}
                  </div>
                  <CardTitle className="text-sm">{b.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{b.text || "—"}</p>
              </CardContent>
            </Card>
          );
        })}
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
            {insights.avancos.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.avancos.map((a, i) => <li key={i} className="text-xs flex gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />{a}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Riscos</CardTitle></CardHeader>
          <CardContent>
            {insights.riscos.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
              <ul className="space-y-1.5">{insights.riscos.map((r, i) => <li key={i} className="text-xs flex gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />{r}</li>)}</ul>}
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-red-600" /> Recorrências</CardTitle></CardHeader>
          <CardContent>
            {insights.recorrencias.length === 0 ? <p className="text-xs text-muted-foreground">—</p> :
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
