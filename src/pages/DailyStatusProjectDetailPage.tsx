import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
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
  const { isAdmin, productIds: allowedIds, canAccessProduct, loading: authzLoading } = useAuthorizedProducts();
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
    () => {
      const base = isSquadMode
        ? (ownerSquad?.product_ids ?? [])
        : (productId ? [productId] : []);
      // Aplica trava por vínculo: filtra produtos não autorizados do escopo desta view.
      if (isAdmin || !allowedIds) return base;
      return base.filter((id) => allowedIds.includes(id));
    },
    [isSquadMode, ownerSquad, productId, isAdmin, allowedIds],
  );

  // Bloqueio de acesso direto via URL: redireciona para a Saúde do Projeto
  // se o usuário não tiver vínculo com o produto/squad solicitado.
  useEffect(() => {
    if (authzLoading) return;
    if (isAdmin) return;
    if (!squads.length && !products.length) return; // ainda carregando catálogos

    if (isSquadMode) {
      // Squad só é acessível se possuir ao menos um produto autorizado
      const ownerProducts = ownerSquad?.product_ids ?? [];
      const ok = ownerProducts.some((pid) => (allowedIds ?? []).includes(pid));
      if (!ok) {
        toast.error("Acesso não autorizado a este projeto.");
        navigate("/daily-status", { replace: true });
      }
    } else if (productId && !canAccessProduct(productId)) {
      toast.error("Acesso não autorizado a este projeto.");
      navigate("/daily-status", { replace: true });
    }
  }, [authzLoading, isAdmin, allowedIds, isSquadMode, squadId, productId, ownerSquad, squads.length, products.length, canAccessProduct, navigate]);
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

  // Sprints deste projeto
  const productSprints = useMemo(
    () => sprints.filter((s) => viewProductIds.includes(s.product_id ?? "")),
    [sprints, viewProductIds],
  );

  // Sprint atual: status 'active'/'in_progress' OU contendo a data de hoje, senão a mais recente
  const currentSprint = useMemo(() => {
    if (!productSprints.length) return null;
    const today = format(new Date(), "yyyy-MM-dd");
    const active = productSprints.find((s) => ["active", "in_progress"].includes(s.status));
    if (active) return active;
    const inRange = productSprints.find((s) => s.start_date <= today && today <= s.end_date);
    if (inRange) return inRange;
    return [...productSprints].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;
  }, [productSprints]);

  // Avanços/gargalos da sprint atual
  const currentSprintStats = useMemo(() => {
    if (!currentSprint) return { avancos: 0, gargalos: 0, dailies: 0 };
    const ds = allDailies.filter((d) => d.sprint_id === currentSprint.id);
    const avancos = ds.reduce((s, d) => s + (d.ai_insights?.avancos?.length ?? 0) + (d.ai_insights?.avancos_consolidados?.length ?? 0), 0);
    const gargalos = ds.reduce((s, d) => s + (d.ai_insights?.recorrencias?.length ?? 0), 0);
    return { avancos, gargalos, dailies: ds.length };
  }, [currentSprint, allDailies]);

  // Membros do projeto: usa squad vinculada quando existe
  const projectMemberCount = ownerSquad?.member_ids.length ?? 0;

  // Status do produto (somente product mode)
  const productStatus = product?.status ?? "active";
  const productStatusMeta: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    paused: { label: "Em Pausa", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    inactive: { label: "Concluído", cls: "bg-muted text-muted-foreground border-border" },
  };

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
      )}

      <NewDailyDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        lockedProductId={isSquadMode ? undefined : productId}
        allowedProductIds={isSquadMode ? viewProductIds : undefined}
        allowedMemberIds={ownerSquad?.member_ids}
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

      {/* Modal de detalhe de ociosidade */}
      <Dialog open={!!idleDetail} onOpenChange={(o) => !o && setIdleDetail(null)}>
        <DialogContent className="max-w-2xl">
          {idleDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5 text-blue-600" /> Ociosidade · {idleDetail.nome}
                </DialogTitle>
                <DialogDescription>
                  {idleDetail.ocorrencias.length} ocorrência(s) registrada(s) pela IA. Veja os motivos e datas.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                <ul className="space-y-2">
                  {idleDetail.ocorrencias.map((occ, i) => (
                    <li key={i} className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {format(parseISO(occ.date), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                        {occ.product && (
                          <Badge variant="secondary" className="text-[10px]">{occ.product}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{occ.motivo || "—"}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RawReportView({ summary, presentMembers }: { summary: string; presentMembers: string[] }) {
  const blocks = parseRawReport(summary || "");
  const initials = (name: string) =>
    name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (!summary?.trim()) {
    return <p className="text-sm text-muted-foreground italic">Sem texto registrado.</p>;
  }

  return (
    <div className="space-y-3">
      {presentMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presentMembers.map((n, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>
          ))}
        </div>
      )}
      <div className="space-y-2.5">
        {blocks.map((b, i) => {
          const isMeta = /observa|coordena/i.test(b.name);
          return (
            <Card key={i} className={cn(
              "border-l-4",
              isMeta ? "border-l-amber-500/60 bg-amber-500/5" : "border-l-primary/60 bg-card/40",
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                    isMeta ? "bg-amber-500/20 text-amber-700" : "bg-primary/15 text-primary",
                  )}>
                    {isMeta ? "📝" : initials(b.name)}
                  </div>
                  <CardTitle className="text-sm">{b.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {b.text || "—"}
                </p>
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