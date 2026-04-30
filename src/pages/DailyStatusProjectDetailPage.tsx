import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInCalendarDays, differenceInHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Plus, CalendarCheck, TrendingUp, AlertTriangle, Flame,
  Sparkles, Activity, Smile, Frown, Meh, Heart, Loader2, ListChecks, CheckCircle2,
  UserMinus, UserPlus, Link2, Target, ShieldAlert, History, Pencil, Lock, FileDown,
  Compass, GitBranch, BookOpen, Settings, BarChart3, UsersRound, Crown, Download,
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
import { NewDailyDialog } from "@/components/daily/NewDailyDialog";
import { EditDailyDialog } from "@/components/daily/EditDailyDialog";
import { ProjectConfigModal } from "@/components/daily/ProjectConfigModal";
import { downloadElementAsPdf } from "@/lib/visualPdf";
import { downloadDailyReportPdf, parseRawReport } from "@/lib/dailyReportPdf";
import { toast } from "sonner";

interface AIRecorrencia { descricao: string; dias_consecutivos: number; responsavel?: string; }
interface AIOcioso { nome: string; motivo: string; }
interface AISobrecarregado { nome: string; motivo: string; nivel_risco: "baixo" | "medio" | "alto"; }
interface AIDependencia { item: string; bloqueador: string; tipo: "externo" | "interno"; }
interface AIExtraEscopo { descricao: string; responsavel: string; motivo: string; }
interface AIProgressoBacklog { task: string; percentual_conclusao: number; status: "nao_iniciado" | "em_andamento" | "concluido" | "bloqueado"; evidencia: string; }
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
  tarefas_extra_escopo?: AIExtraEscopo[];
  progresso_backlog?: AIProgressoBacklog[];
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

export default function DailyStatusProjectDetailPage() {
  const { productId, squadId } = useParams<{ productId: string; squadId: string }>();
  const isSquadMode = !!squadId;
  const navigate = useNavigate();
  const { data: products = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDaily, setSelectedDaily] = useState<DailyRow | null>(null);
  const [editingDaily, setEditingDaily] = useState<DailyRow | null>(null);
  const [openConfig, setOpenConfig] = useState(false);
  const [configFor, setConfigFor] = useState<{ id: string; name: string } | null>(null);
  const [idleDetail, setIdleDetail] = useState<{ nome: string; ocorrencias: { date: string; motivo: string; product?: string }[] } | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const executiveRef = useRef<HTMLDivElement>(null);
  // "all" = Geral (todas as sprints); senão sprintId
  const [sprintFilter, setSprintFilter] = useState<string>("all");

  const product = products.find((p) => p.id === productId);
  // Squad mode: identify squad from URL; Product mode: derive from product
  const ownerSquad = useMemo(
    () => isSquadMode
      ? squads.find((s) => s.id === squadId)
      : squads.find((s) => s.product_ids.includes(productId ?? "")),
    [squads, productId, squadId, isSquadMode],
  );
  const squadLeader = useMemo(
    () => ownerSquad?.leader_profile_id ? profiles.find((p) => p.id === ownerSquad.leader_profile_id) : null,
    [ownerSquad, profiles],
  );
  // Active product list for the current view (squad's products or single product)
  const viewProductIds = useMemo(
    () => isSquadMode
      ? (ownerSquad?.product_ids ?? [])
      : (productId ? [productId] : []),
    [isSquadMode, ownerSquad, productId],
  );
  const viewProducts = useMemo(
    () => viewProductIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products,
    [viewProductIds, products],
  );
  const siblingProducts = useMemo(
    () => isSquadMode
      ? viewProducts // in squad mode, "siblings" = all squad products
      : (ownerSquad?.product_ids ?? []).filter((id) => id !== productId).map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products,
    [ownerSquad, productId, products, isSquadMode, viewProducts],
  );

  // Cross-product allocation: load dailies of sibling products to detect multi-product overload
  const siblingProductIds = isSquadMode
    ? [] // squad mode already loads everything via allDailies
    : siblingProducts.map((p) => p.id);
  const { data: squadDailies = [] } = useQuery({
    queryKey: ["daily_status_squad", ownerSquad?.id, siblingProductIds.join(",")],
    enabled: !isSquadMode && !!ownerSquad && siblingProductIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*").in("product_id", siblingProductIds);
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const productNameMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const productColorMap = Object.fromEntries(products.map((p) => [p.id, p.color]));

  const { data: allDailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_history", isSquadMode ? `squad:${squadId}` : productId, viewProductIds.join(",")],
    enabled: viewProductIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*").in("product_id", viewProductIds).order("status_date", { ascending: false });
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  // Sprints que possuem ao menos uma daily neste projeto (para popular o filtro)
  const sprintsWithDailies = useMemo(() => {
    const ids = new Set(allDailies.map((d) => d.sprint_id).filter(Boolean));
    return sprints.filter((s) => ids.has(s.id));
  }, [allDailies, sprints]);

  // Dailies filtradas conforme filtro de sprint (persistente entre abas)
  const dailies = useMemo(() => {
    if (sprintFilter === "all") return allDailies;
    return allDailies.filter((d) => d.sprint_id === sprintFilter);
  }, [allDailies, sprintFilter]);

  const { data: approvedBacklog = [] } = useQuery({
    queryKey: ["project_backlog_approved", isSquadMode ? `squad:${squadId}` : productId, viewProductIds.join(",")],
    enabled: viewProductIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .select("*").in("product_id", viewProductIds).eq("approved", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; task: string; likely_owner: string; deadline: string; risk_mitigation: string; category: string; product_id: string }>;
    },
  });

  const sprintNameMap = Object.fromEntries(sprints.map((s) => [s.id, s.name]));
  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  // Sequential counter: order chronologically (oldest = #1)
  const dailyNumberMap = useMemo(() => {
    const sortedAsc = [...dailies].sort((a, b) => a.status_date.localeCompare(b.status_date));
    const map: Record<string, number> = {};
    sortedAsc.forEach((d, i) => { map[d.id] = i + 1; });
    return map;
  }, [dailies]);

  const latest = dailies[0];
  const latestInsights = latest?.ai_insights;

  // Aggregated stats across all dailies of the project
  const exec = useMemo(() => {
    if (!dailies.length) return null;

    const avgBlocker = dailies.reduce((s, d) => s + d.blocker_level, 0) / dailies.length;

    // History of bottlenecks: aggregate recorrencias by descricao across all dailies
    const bottleneckMap = new Map<string, { descricao: string; ocorrencias: number; maxDias: number }>();
    for (const d of dailies) {
      for (const r of d.ai_insights?.recorrencias ?? []) {
        const key = r.descricao.toLowerCase().trim();
        const cur = bottleneckMap.get(key);
        if (cur) {
          cur.ocorrencias += 1;
          cur.maxDias = Math.max(cur.maxDias, r.dias_consecutivos);
        } else {
          bottleneckMap.set(key, { descricao: r.descricao, ocorrencias: 1, maxDias: r.dias_consecutivos });
        }
      }
    }
    const historicoGargalos = Array.from(bottleneckMap.values()).sort((a, b) => b.ocorrencias - a.ocorrencias);

    // Idle collaborators: aggregate by name across history
    const idleMap = new Map<string, { nome: string; vezes: number; datas: string[] }>();
    for (const d of dailies) {
      for (const o of d.ai_insights?.colaboradores_ociosos ?? []) {
        const key = o.nome.toLowerCase().trim();
        const cur = idleMap.get(key);
        if (cur) {
          cur.vezes += 1;
          cur.datas.push(d.status_date);
        } else {
          idleMap.set(key, { nome: o.nome, vezes: 1, datas: [d.status_date] });
        }
      }
    }
    const ociosos = Array.from(idleMap.values()).sort((a, b) => b.vezes - a.vezes);

    // Overloaded collaborators
    const overMap = new Map<string, { nome: string; vezes: number; datas: string[]; nivel_risco: AISobrecarregado["nivel_risco"] }>();
    const riskRank: Record<AISobrecarregado["nivel_risco"], number> = { baixo: 1, medio: 2, alto: 3 };
    for (const d of dailies) {
      for (const s of d.ai_insights?.colaboradores_sobrecarregados ?? []) {
        const key = s.nome.toLowerCase().trim();
        const cur = overMap.get(key);
        if (cur) {
          cur.vezes += 1;
          cur.datas.push(d.status_date);
          if (riskRank[s.nivel_risco] > riskRank[cur.nivel_risco]) cur.nivel_risco = s.nivel_risco;
        } else {
          overMap.set(key, { nome: s.nome, vezes: 1, datas: [d.status_date], nivel_risco: s.nivel_risco });
        }
      }
    }
    const sobrecarregados = Array.from(overMap.values()).sort((a, b) => riskRank[b.nivel_risco] - riskRank[a.nivel_risco] || b.vezes - a.vezes);

    // External dependencies (latest only — most actionable now)
    const dependenciasExternas = (latestInsights?.dependencias_externas ?? []).filter((d) => d.tipo === "externo");

    // Unblock efficiency: how many recurrences disappeared between consecutive dailies (avg "lifespan" days)
    // Heuristic: look at each recorrencia's last seen vs first seen across dailies (in chronological order)
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
      avgBlocker,
      total: dailies.length,
      latestDate: latest?.status_date,
      daysSinceLatest: latest ? differenceInCalendarDays(new Date(), parseISO(latest.status_date)) : 0,
      historicoGargalos,
      ociosos,
      sobrecarregados,
      dependenciasExternas,
      eficienciaDesbloqueio,
    };
  }, [dailies, latest, latestInsights]);

  // Multi-product allocation radar (cross-product within the same Squad)
  const multiProductAllocation = useMemo(() => {
    if (!ownerSquad) return null;
    const all = [...allDailies, ...squadDailies];
    const idle = new Map<string, { nome: string; produtos: Set<string>; vezes: number }>();
    const over = new Map<string, { nome: string; produtos: Set<string>; vezes: number; nivel: AISobrecarregado["nivel_risco"] }>();
    const rank: Record<AISobrecarregado["nivel_risco"], number> = { baixo: 1, medio: 2, alto: 3 };
    for (const d of all) {
      const pname = productNameMap[d.product_id] ?? "—";
      for (const o of d.ai_insights?.colaboradores_ociosos ?? []) {
        const k = o.nome.toLowerCase().trim();
        const cur = idle.get(k) ?? { nome: o.nome, produtos: new Set<string>(), vezes: 0 };
        cur.produtos.add(pname); cur.vezes += 1;
        idle.set(k, cur);
      }
      for (const s of d.ai_insights?.colaboradores_sobrecarregados ?? []) {
        const k = s.nome.toLowerCase().trim();
        const cur = over.get(k) ?? { nome: s.nome, produtos: new Set<string>(), vezes: 0, nivel: s.nivel_risco };
        cur.produtos.add(pname); cur.vezes += 1;
        if (rank[s.nivel_risco] > rank[cur.nivel]) cur.nivel = s.nivel_risco;
        over.set(k, cur);
      }
    }
    return {
      ociosos: Array.from(idle.values()).map((v) => ({ ...v, produtos: Array.from(v.produtos) })).sort((a, b) => b.produtos.length - a.produtos.length || b.vezes - a.vezes),
      sobrecarregados: Array.from(over.values()).map((v) => ({ ...v, produtos: Array.from(v.produtos) })).sort((a, b) => rank[b.nivel] - rank[a.nivel] || b.produtos.length - a.produtos.length),
    };
  }, [ownerSquad, allDailies, squadDailies, productNameMap]);

  // Comparativo entre sprints — sempre com base em todas as dailies do projeto
  const sprintComparison = useMemo(() => {
    const map = new Map<string, { sprintId: string; name: string; total: number; avgBlocker: number; gargalos: number; ociosos: number; sobrecarga: number; extraEscopo: number; ultimaData: string }>();
    for (const d of allDailies) {
      const key = d.sprint_id;
      if (!key) continue;
      const cur = map.get(key) ?? {
        sprintId: key,
        name: sprintNameMap[key] ?? "Sprint —",
        total: 0,
        avgBlocker: 0,
        gargalos: 0,
        ociosos: 0,
        sobrecarga: 0,
        extraEscopo: 0,
        ultimaData: d.status_date,
      };
      cur.total += 1;
      cur.avgBlocker += d.blocker_level;
      cur.gargalos += d.ai_insights?.recorrencias?.length ?? 0;
      cur.ociosos += d.ai_insights?.colaboradores_ociosos?.length ?? 0;
      cur.sobrecarga += d.ai_insights?.colaboradores_sobrecarregados?.length ?? 0;
      cur.extraEscopo += d.ai_insights?.tarefas_extra_escopo?.length ?? 0;
      if (d.status_date > cur.ultimaData) cur.ultimaData = d.status_date;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((s) => ({ ...s, avgBlocker: s.total ? s.avgBlocker / s.total : 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDailies, sprintNameMap]);

  const canEdit = (d: DailyRow) => differenceInHours(new Date(), new Date(d.created_at)) <= 72;

  const handleExportPdf = async () => {
    if (!executiveRef.current) return;
    const reportName = isSquadMode
      ? (ownerSquad?.name ?? "Squad")
      : (product?.name ?? "Projeto");
    setExportingPdf(true);
    try {
      await downloadElementAsPdf(
        executiveRef.current,
        `dashboard-executivo-${reportName.replace(/\s+/g, "_")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadDaily = (d: DailyRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const productName = productNameMap[d.product_id] ?? (product?.name ?? "Projeto");
    downloadDailyReportPdf({
      productName,
      dailyNumber: dailyNumberMap[d.id] ?? 0,
      statusDate: d.status_date,
      sprintLabel: d.sprint_label?.trim() || (sprintNameMap[d.sprint_id] ?? "—"),
      blockerLevel: d.blocker_level,
      presentMembers: (d.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id),
      rawSummary: d.summary ?? "",
      insights: d.ai_insights,
    });
  };

  const openIdleDetail = (nome: string) => {
    const occ: { date: string; motivo: string; product?: string }[] = [];
    for (const d of dailies) {
      for (const o of d.ai_insights?.colaboradores_ociosos ?? []) {
        if (o.nome.toLowerCase().trim() === nome.toLowerCase().trim()) {
          occ.push({ date: d.status_date, motivo: o.motivo, product: productNameMap[d.product_id] });
        }
      }
    }
    occ.sort((a, b) => b.date.localeCompare(a.date));
    setIdleDetail({ nome, ocorrencias: occ });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/daily-status")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {isSquadMode ? (ownerSquad?.name ?? "Squad") : (product?.name ?? "Projeto")}
            </h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              {isSquadMode ? (
                <>
                  <span className="flex items-center gap-1">
                    <UsersRound className="h-3.5 w-3.5" /> Squad consolidada · {viewProducts.length} produto(s)
                  </span>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    {squadLeader ? `${squadLeader.first_name} ${squadLeader.last_name}` : "Sem líder"}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {viewProducts.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span>Saúde do Projeto · dashboard evolutivo</span>
                  {ownerSquad && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <UsersRound className="h-3 w-3" /> Squad: {ownerSquad.name}
                      {siblingProducts.length > 0 && <span className="text-muted-foreground">· +{siblingProducts.length} produto(s)</span>}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <Select value={sprintFilter} onValueChange={setSprintFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Filtrar sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Geral (todas)</SelectItem>
              {sprintsWithDailies.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : allDailies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="mb-4">Nenhuma daily registrada para este projeto ainda.</p>
            <Button onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Daily
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="historico" className="space-y-4">
          <TabsList>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="escopo">Escopo e Backlog</TabsTrigger>
            <TabsTrigger value="executivo">Dashboard Executivo</TabsTrigger>
          </TabsList>

          {/* HISTORICO – cards resumidos */}
          <TabsContent value="historico" className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {sprintFilter === "all"
                  ? `Mostrando todas as ${dailies.length} daily(s) do projeto.`
                  : `Mostrando ${dailies.length} daily(s) da ${sprintNameMap[sprintFilter] ?? "sprint"}.`}
              </p>
              <Button onClick={() => setOpenDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Nova Daily
              </Button>
            </div>
            {dailies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma daily nesta sprint. Selecione "Geral" ou registre uma nova daily.
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
                        {isSquadMode && (
                          <Badge variant="outline" className="flex-shrink-0 text-[10px] gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: productColorMap[d.product_id] ?? "hsl(var(--primary))" }} />
                            {productNameMap[d.product_id] ?? "Projeto"}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          {d.sprint_label?.trim() ? d.sprint_label : (sprintNameMap[d.sprint_id] ?? "Sprint —")}
                        </Badge>
                        <p className="text-sm text-muted-foreground truncate italic">"{resumo}"</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">Bloqueio {d.blocker_level}/5</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
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

          {/* ESCOPO E BACKLOG – itens aprovados + status de entrega */}
          <TabsContent value="escopo" className="space-y-3">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {isSquadMode ? (
                viewProducts.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigFor({ id: p.id, name: p.name })}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                    Configurar · {p.name}
                  </Button>
                ))
              ) : (
                <Button variant="outline" size="sm" onClick={() => setOpenConfig(true)}>
                  <Settings className="h-4 w-4 mr-2" /> Configurar Metas/Backlog
                </Button>
              )}
            </div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></div>
                    <div>
                      <CardTitle className="text-base">
                        {isSquadMode ? "Escopo Aprovado da Squad" : "Escopo Aprovado do Projeto"}
                      </CardTitle>
                      <CardDescription>
                        {isSquadMode
                          ? "Itens aprovados de todos os produtos da squad. Use os botões acima para configurar cada produto."
                          : "Itens do Contexto Mestre + status de entrega calculado pelas dailys. Use \"Configurar Metas/Backlog\" para complementar o contexto a qualquer momento."}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{approvedBacklog.length} item(ns)</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {approvedBacklog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhum item aprovado ainda. Clique em "Configurar Metas/Backlog" para enviar a documentação e aprovar os itens sugeridos pela IA.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {approvedBacklog.map((it) => {
                      const prog = (latestInsights?.progresso_backlog ?? []).find(
                        (p) => p.task.toLowerCase().trim() === it.task.toLowerCase().trim(),
                      );
                      const pct = prog ? Math.max(0, Math.min(100, Math.round(prog.percentual_conclusao))) : 0;
                      const statusKey = prog?.status ?? "nao_iniciado";
                      const statusMeta: Record<string, { label: string; cls: string; bar: string }> = {
                        nao_iniciado: { label: "Pendente", cls: "bg-muted text-muted-foreground border-border", bar: "bg-muted-foreground/30" },
                        em_andamento: { label: "Em andamento", cls: "bg-primary/15 text-primary border-primary/30", bar: "bg-primary" },
                        concluido: { label: "Concluído", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", bar: "bg-emerald-500" },
                        bloqueado: { label: "Bloqueado", cls: "bg-red-500/15 text-red-600 border-red-500/30", bar: "bg-red-500" },
                      };
                      const meta = statusMeta[statusKey];
                      return (
                        <li key={it.id} className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{it.task}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                                {isSquadMode && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: productColorMap[it.product_id] ?? "hsl(var(--primary))" }} />
                                    {productNameMap[it.product_id] ?? "—"}
                                  </Badge>
                                )}
                                <span><strong>Resp:</strong> {it.likely_owner || "—"}</span>
                                <span><strong>Prazo:</strong> {it.deadline || "—"}</span>
                                {it.category && <Badge variant="outline" className="text-[10px]">{it.category}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={cn("border text-xs", meta.cls)}>{meta.label}</Badge>
                              <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full transition-all", meta.bar)} style={{ width: `${pct}%` }} />
                          </div>
                          {prog?.evidencia && (
                            <p className="text-[11px] text-muted-foreground italic">"{prog.evidencia}"</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXECUTIVO – central de inteligência */}
          <TabsContent value="executivo" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Visão: {sprintFilter === "all" ? "Geral (todas as sprints)" : sprintNameMap[sprintFilter] ?? "Sprint"}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!exec || exportingPdf}>
                {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                {exportingPdf ? "Gerando..." : "Baixar Relatório PDF"}
              </Button>
            </div>
            <div ref={executiveRef} className="space-y-4 bg-background">
            {/* Métricas rápidas */}
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

            {/* Gargalos */}
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
                  <CardDescription>Mais frequentes na sprint</CardDescription>
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

            {/* Radar de Alocação */}
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
                            Datas: {o.datas.map((d) => format(new Date(d), "dd/MM", { locale: ptBR })).join(", ")}
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

            {/* Radar Multi-Produto (Squad) */}
            {ownerSquad && siblingProducts.length > 0 && multiProductAllocation && (
              <Card className="border-violet-500/30 bg-violet-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-violet-500/15 text-violet-600"><UsersRound className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Radar Multi-Produto · Squad {ownerSquad.name}</CardTitle>
                  </div>
                  <CardDescription>
                    Detecta colaboradores acumulando tarefas em mais de um produto da mesma squad
                    ({(isSquadMode
                      ? viewProducts.map((p) => p.name)
                      : [product?.name, ...siblingProducts.map((p) => p.name)]
                    ).filter(Boolean).join(", ")}).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sobrecarga cruzada</h4>
                    {multiProductAllocation.sobrecarregados.filter((s) => s.produtos.length > 1).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma sobrecarga multi-produto detectada.</p>
                    ) : (
                      <ul className="space-y-2">
                        {multiProductAllocation.sobrecarregados.filter((s) => s.produtos.length > 1).map((s, i) => (
                          <li key={i} className="p-2 rounded-md bg-background/60 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{s.nome}</span>
                              <Badge className={cn("border text-xs", RISK_CLS[s.nivel])}>Risco {s.nivel}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {s.produtos.map((pn, pi) => (
                                <Badge key={pi} variant="outline" className="text-[10px]">{pn}</Badge>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Ociosidade cruzada</h4>
                    {multiProductAllocation.ociosos.filter((o) => o.produtos.length > 1).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum colaborador ocioso em múltiplos produtos.</p>
                    ) : (
                      <ul className="space-y-2">
                        {multiProductAllocation.ociosos.filter((o) => o.produtos.length > 1).map((o, i) => (
                          <li key={i} className="p-2 rounded-md bg-background/60 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{o.nome}</span>
                              <Badge variant="secondary" className="text-xs">{o.vezes}x</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {o.produtos.map((pn, pi) => (
                                <Badge key={pi} variant="outline" className="text-[10px]">{pn}</Badge>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Visão Estratégica */}
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

            {/* Dependências externas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Link2 className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Mapa de Dependências Externas</CardTitle>
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

            {/* Tarefas Extra-Escopo */}
            <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-fuchsia-500/15 text-fuchsia-600"><Compass className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Tarefas Extra-Escopo</CardTitle>
                </div>
                <CardDescription>Risco de desvio: relatadas hoje, fora do Backlog Mestre</CardDescription>
              </CardHeader>
              <CardContent>
                {!latestInsights?.tarefas_extra_escopo?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa fora do escopo. ✅</p>
                ) : (
                  <ul className="space-y-2">
                    {latestInsights.tarefas_extra_escopo.map((t, i) => (
                      <li key={i} className="p-2 rounded-md bg-background/50 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{t.descricao}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{t.responsavel || "—"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.motivo}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Status do Backlog (progresso estimado) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><GitBranch className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Status do Backlog</CardTitle>
                </div>
                <CardDescription>Percentual de conclusão estimado pela IA com base nas dailys</CardDescription>
              </CardHeader>
              <CardContent>
                {!latestInsights?.progresso_backlog?.length ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum progresso calculado. Cadastre o Backlog Mestre em "Configuração e Backlog".
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {latestInsights.progresso_backlog
                      .slice()
                      .sort((a, b) => b.percentual_conclusao - a.percentual_conclusao)
                      .map((p, i) => {
                        const pct = Math.max(0, Math.min(100, Math.round(p.percentual_conclusao)));
                        const statusCls =
                          p.status === "concluido" ? "bg-emerald-500" :
                          p.status === "bloqueado" ? "bg-red-500" :
                          p.status === "em_andamento" ? "bg-primary" : "bg-muted-foreground/40";
                        const statusLabel =
                          p.status === "concluido" ? "Concluído" :
                          p.status === "bloqueado" ? "Bloqueado" :
                          p.status === "em_andamento" ? "Em andamento" : "Não iniciado";
                        return (
                          <li key={i} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-medium">{p.task}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="text-[10px]">{statusLabel}</Badge>
                                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full transition-all", statusCls)} style={{ width: `${pct}%` }} />
                            </div>
                            {p.evidencia && (
                              <p className="text-[11px] text-muted-foreground italic line-clamp-1">{p.evidencia}</p>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Próximos passos */}
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

            {/* Comparativo entre sprints */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Comparativo entre Sprints</CardTitle>
                </div>
                <CardDescription>Evolução agregada por sprint (todas as dailys do projeto)</CardDescription>
              </CardHeader>
              <CardContent>
                {sprintComparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sprint comparável ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                          <th className="py-2 pr-3 font-medium">Sprint</th>
                          <th className="py-2 px-2 font-medium text-center">Dailys</th>
                          <th className="py-2 px-2 font-medium text-center">Bloqueio médio</th>
                          <th className="py-2 px-2 font-medium text-center">Gargalos</th>
                          <th className="py-2 px-2 font-medium text-center">Ociosos</th>
                          <th className="py-2 px-2 font-medium text-center">Sobrecarga</th>
                          <th className="py-2 px-2 font-medium text-center">Extra-escopo</th>
                          <th className="py-2 pl-2 font-medium">Última</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sprintComparison.map((s) => {
                          const blockerCls =
                            s.avgBlocker >= 4 ? "text-red-600" :
                            s.avgBlocker >= 3 ? "text-amber-600" : "text-emerald-600";
                          const isCurrent = sprintFilter === s.sprintId;
                          return (
                            <tr key={s.sprintId} className={cn("border-b border-border/40 hover:bg-accent/30 transition-colors", isCurrent && "bg-primary/5")}>
                              <td className="py-2 pr-3 font-medium">
                                <button
                                  className="text-left hover:text-primary transition-colors"
                                  onClick={() => setSprintFilter(s.sprintId)}
                                  title="Filtrar por esta sprint"
                                >
                                  {s.name}
                                </button>
                              </td>
                              <td className="py-2 px-2 text-center tabular-nums">{s.total}</td>
                              <td className={cn("py-2 px-2 text-center tabular-nums font-medium", blockerCls)}>{s.avgBlocker.toFixed(1)}</td>
                              <td className="py-2 px-2 text-center tabular-nums">{s.gargalos}</td>
                              <td className="py-2 px-2 text-center tabular-nums">{s.ociosos}</td>
                              <td className="py-2 px-2 text-center tabular-nums">{s.sobrecarga}</td>
                              <td className="py-2 px-2 text-center tabular-nums">{s.extraEscopo}</td>
                              <td className="py-2 pl-2 text-xs text-muted-foreground">
                                {format(new Date(s.ultimaData), "dd/MM/yyyy", { locale: ptBR })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <NewDailyDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        lockedProductId={isSquadMode ? undefined : productId}
        allowedProductIds={isSquadMode ? viewProductIds : undefined}
      />
      <EditDailyDialog open={!!editingDaily} onOpenChange={(o) => !o && setEditingDaily(null)} daily={editingDaily} onSaved={() => setSelectedDaily(null)} />
      {!isSquadMode && product && (
        <ProjectConfigModal
          open={openConfig}
          onOpenChange={setOpenConfig}
          productId={product.id}
          productName={product.name}
        />
      )}
      {configFor && (
        <ProjectConfigModal
          open={!!configFor}
          onOpenChange={(o) => !o && setConfigFor(null)}
          productId={configFor.id}
          productName={configFor.name}
        />
      )}

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
                  <Badge variant="secondary">{sprintNameMap[selectedDaily.sprint_id] ?? "Sprint —"}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Bloqueio IA {selectedDaily.blocker_level}/5
                  </Badge>
                  {(selectedDaily.present_member_ids ?? []).length > 0 && (
                    <span className="text-xs">
                      {(selectedDaily.present_member_ids ?? []).length} membro(s) presente(s)
                    </span>
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
                    <div className="space-y-3">
                      {(selectedDaily.present_member_ids ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedDaily.present_member_ids ?? []).map((id, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{memberNameMap[id] ?? id}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDaily.summary || "Sem texto registrado."}</p>
                    </div>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Avanços</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.avancos.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">{insights.avancos.map((a, i) => <li key={i} className="text-xs flex gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />{a}</li>)}</ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Riscos</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.riscos.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">{insights.riscos.map((r, i) => <li key={i} className="text-xs flex gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />{r}</li>)}</ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-red-600" /> Recorrências</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.recorrencias.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">{insights.recorrencias.map((r, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-start justify-between gap-1.5">
                    <span>{r.descricao}</span>
                    <Badge variant="destructive" className="text-[10px] flex-shrink-0">{r.dias_consecutivos}d</Badge>
                  </div>
                  {r.responsavel && <p className="text-[10px] text-muted-foreground">Resp: {r.responsavel}</p>}
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>
      </div>

      {(insights.colaboradores_ociosos?.length || insights.colaboradores_sobrecarregados?.length) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!!insights.colaboradores_ociosos?.length && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserMinus className="h-4 w-4 text-blue-600" /> Ociosos</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">{insights.colaboradores_ociosos.map((o, i) => (
                  <li key={i} className="text-xs"><strong>{o.nome}</strong> — {o.motivo}</li>
                ))}</ul>
              </CardContent>
            </Card>
          )}
          {!!insights.colaboradores_sobrecarregados?.length && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4 text-orange-600" /> Sobrecarregados</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">{insights.colaboradores_sobrecarregados.map((s, i) => (
                  <li key={i} className="text-xs flex items-start justify-between gap-2">
                    <span><strong>{s.nome}</strong> — {s.motivo}</span>
                    <Badge className={cn("border text-[10px]", RISK_CLS[s.nivel_risco])}>{s.nivel_risco}</Badge>
                  </li>
                ))}</ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!!insights.dependencias_externas?.length && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Dependências</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">{insights.dependencias_externas.map((d, i) => (
              <li key={i} className="text-xs flex items-center justify-between gap-2">
                <span>{d.item}</span>
                <Badge variant={d.tipo === "externo" ? "outline" : "secondary"} className="text-[10px]">
                  {d.tipo === "externo" ? "Externo" : "Interno"} · {d.bloqueador}
                </Badge>
              </li>
            ))}</ul>
          </CardContent>
        </Card>
      )}

      {!!insights.proximos_passos?.length && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Próximos Passos</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">{insights.proximos_passos.map((p, i) => (
              <li key={i} className="text-xs flex gap-1.5"><Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />{p}</li>
            ))}</ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}