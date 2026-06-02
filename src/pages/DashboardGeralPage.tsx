import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, Users, Activity as ActivityIcon, Target } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useActiveProducts } from "@/hooks/useProducts";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { useActivities } from "@/hooks/useActivities";
import { useSprints } from "@/hooks/useSprints";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function toDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export default function DashboardGeralPage() {
  const { productIds: authorizedIds, isAdmin } = useAuthorizedProducts();
  const { data: allProducts = [] } = useActiveProducts();

  const visibleProducts = useMemo(() => {
    if (isAdmin || !authorizedIds) return allProducts;
    const set = new Set(authorizedIds);
    return allProducts.filter((p) => set.has(p.id));
  }, [allProducts, authorizedIds, isAdmin]);

  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Scope: list of product ids to filter by
  const scopeIds = useMemo(() => {
    if (selectedProduct !== "all") return [selectedProduct];
    return visibleProducts.map((p) => p.id);
  }, [selectedProduct, visibleProducts]);

  const { data: activities = [] } = useActivities(scopeIds);
  const { data: sprints = [] } = useSprints();
  const { data: sprintProducts = [] } = useSprintProducts();
  const { data: teamMembers = [] } = useTeamMembers();

  const scopeSet = useMemo(() => new Set(scopeIds), [scopeIds]);

  // Sprints in scope (by product_id or via sprint_products)
  const sprintsInScope = useMemo(() => {
    const linkedByProduct: Record<string, Set<string>> = {};
    sprintProducts.forEach((sp) => {
      linkedByProduct[sp.sprint_id] ??= new Set();
      linkedByProduct[sp.sprint_id].add(sp.product_id);
    });
    return sprints.filter((s) => {
      if (s.product_id && scopeSet.has(s.product_id)) return true;
      const linked = linkedByProduct[s.id];
      if (linked) for (const pid of linked) if (scopeSet.has(pid)) return true;
      return false;
    });
  }, [sprints, sprintProducts, scopeSet]);

  const productNameMap = useMemo(
    () => Object.fromEntries(allProducts.map((p) => [p.id, p.name])),
    [allProducts],
  );
  const memberNameMap = useMemo(
    () => Object.fromEntries(teamMembers.map((m) => [m.id, m.name])),
    [teamMembers],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ===== Layer 1 metrics =====
  const totalActivities = activities.length;
  const doneActivities = activities.filter((a) => a.status === "done").length;
  const blockedActivities = activities.filter((a) => a.status === "blocked").length;

  const overdueIds = useMemo(
    () =>
      new Set(
        activities
          .filter((a) => {
            const d = toDate(a.deadline_date);
            return a.status !== "done" && d && d < today;
          })
          .map((a) => a.id),
      ),
    [activities, today],
  );
  const onTrackPct = totalActivities
    ? Math.round(((totalActivities - overdueIds.size) / totalActivities) * 100)
    : 100;

  // Workload per member (active non-done activities in scope assigned to member)
  const memberLoad = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach((a) => {
      if (a.status === "done") return;
      (a.responsible_ids ?? []).forEach((mid) => {
        counts[mid] = (counts[mid] ?? 0) + 1;
      });
    });
    // capacity threshold: ~5 active tasks = 100%
    const THRESHOLD = 5;
    return teamMembers.map((m) => {
      const c = counts[m.id] ?? 0;
      const pct = Math.round((c / THRESHOLD) * 100);
      return { member: m, count: c, pct };
    });
  }, [activities, teamMembers]);

  const overloadedCount = memberLoad.filter((x) => x.pct > 100).length;

  // ===== Daily latest summaries per member =====
  const { data: recentDailies = [] } = useQuery({
    queryKey: ["dashboard_recent_dailies", scopeIds.join(",")],
    enabled: scopeIds.length > 0,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("id, status_date, summary, blocker_level, present_member_ids, product_id")
        .in("product_id", scopeIds)
        .gte("status_date", since.toISOString().slice(0, 10))
        .order("status_date", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string; status_date: string; summary: string; blocker_level: number;
        present_member_ids: string[]; product_id: string;
      }>;
    },
  });

  const lastDailyByMember = useMemo(() => {
    const map: Record<string, { date: string; summary: string }> = {};
    recentDailies.forEach((d) => {
      (d.present_member_ids ?? []).forEach((mid) => {
        if (!map[mid]) map[mid] = { date: d.status_date, summary: d.summary };
      });
    });
    return map;
  }, [recentDailies]);

  // ===== Layer 2: Current sprint burndown =====
  const currentSprint = useMemo(() => {
    const now = today.getTime();
    const active = sprintsInScope.filter((s) => {
      const sd = toDate(s.start_date)?.getTime() ?? 0;
      const ed = toDate(s.end_date)?.getTime() ?? 0;
      return sd <= now && now <= ed;
    });
    if (active.length) return active[0];
    // fallback: nearest upcoming or most recent
    return sprintsInScope[0] ?? null;
  }, [sprintsInScope, today]);

  const { data: currentSprintItems = [] } = useQuery({
    queryKey: ["dashboard_sprint_items", currentSprint?.id ?? "none"],
    enabled: !!currentSprint?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("sprint_backlog_items") as any)
        .select("id, status, updated_at, created_at")
        .eq("sprint_id", currentSprint!.id);
      if (error) throw error;
      return data as Array<{ id: string; status: string; updated_at: string; created_at: string }>;
    },
  });

  const burndownData = useMemo(() => {
    if (!currentSprint) return [];
    const start = toDate(currentSprint.start_date);
    const end = toDate(currentSprint.end_date);
    if (!start || !end) return [];
    const total = currentSprintItems.length;
    const totalDays = Math.max(1, daysBetween(end, start));
    const points: Array<{ day: string; planejado: number; realizado: number | null }> = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayIso = d.toISOString().slice(0, 10);
      const planejado = Math.max(0, +(total - (total * i) / totalDays).toFixed(2));
      let realizado: number | null = null;
      if (d.getTime() <= today.getTime()) {
        const doneByDay = currentSprintItems.filter(
          (it) => it.status === "completed" && toDate(it.updated_at) && toDate(it.updated_at)! <= d,
        ).length;
        realizado = total - doneByDay;
      }
      points.push({
        day: dayIso.slice(5),
        planejado,
        realizado,
      });
    }
    return points;
  }, [currentSprint, currentSprintItems, today]);

  const sprintHealth = useMemo(() => {
    if (!currentSprint) return { label: "Sem sprint ativa", color: "muted", pct: 0 };
    const start = toDate(currentSprint.start_date);
    const end = toDate(currentSprint.end_date);
    if (!start || !end) return { label: "Datas inválidas", color: "muted", pct: 0 };
    const total = currentSprintItems.length || 1;
    const done = currentSprintItems.filter((i) => i.status === "completed").length;
    const totalDays = Math.max(1, daysBetween(end, start));
    const elapsed = Math.max(0, Math.min(totalDays, daysBetween(today, start)));
    const timePct = elapsed / totalDays;
    const donePct = done / total;
    const forecast = Math.round(Math.min(1, donePct / Math.max(0.05, timePct)) * 100);
    if (donePct >= timePct - 0.05) return { label: "🟢 Ritmo Saudável", color: "emerald", pct: forecast };
    if (donePct >= timePct - 0.2) return { label: `⚠️ Tendência de Atraso (~${forecast}%)`, color: "amber", pct: forecast };
    return { label: `🔴 Atraso Crítico (~${forecast}%)`, color: "red", pct: forecast };
  }, [currentSprint, currentSprintItems, today]);

  // ===== Phases / Sprints in cascade =====
  const phaseRows = useMemo(() => {
    return sprintsInScope.slice(0, 6).map((s) => {
      const end = toDate(s.end_date);
      const daysLeft = end ? daysBetween(end, today) : null;
      const items = currentSprint?.id === s.id ? currentSprintItems : null;
      const total = items?.length ?? 0;
      const done = items ? items.filter((i) => i.status === "completed").length : 0;
      const pct = total ? Math.round((done / total) * 100) : 0;
      let color: "emerald" | "amber" | "red" = "emerald";
      if (daysLeft !== null && daysLeft < 0) color = "red";
      else if (daysLeft !== null && daysLeft <= 3 && pct < 80) color = "red";
      else if (daysLeft !== null && daysLeft <= 7 && pct < 60) color = "amber";
      return { sprint: s, pct, daysLeft, color };
    });
  }, [sprintsInScope, currentSprint, currentSprintItems, today]);

  // ===== Top gargalos =====
  const topBottlenecks = useMemo(() => {
    return [...activities]
      .filter((a) => a.status !== "done")
      .map((a) => {
        const d = toDate(a.deadline_date);
        const daysLate = d ? daysBetween(today, d) : null;
        return { a, daysLate };
      })
      .filter((x) => (x.daysLate !== null && x.daysLate > 0) || x.a.status === "blocked")
      .sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0))
      .slice(0, 5);
  }, [activities, today]);

  // ===== Pie data =====
  const pieData = [
    { name: "No prazo", value: totalActivities - overdueIds.size },
    { name: "Em risco", value: overdueIds.size },
  ];
  const PIE_COLORS = ["hsl(142 71% 45%)", "hsl(0 84% 60%)"];

  const goToTab = (tab: string) => {
    const evt = new CustomEvent("dashboard:navigate-tab", { detail: tab });
    window.dispatchEvent(evt);
  };

  return (
    <div className="space-y-6">
      {/* Global filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Visão:</span>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-[320px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visão Geral (Todos os Projetos)</SelectItem>
            {visibleProducts.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Layer 1: Quick metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 neu-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Saúde Geral do Portfólio</p>
              <p className="text-2xl font-bold mt-1">{onTrackPct}%</p>
              <p className="text-[11px] text-muted-foreground">no prazo</p>
            </div>
            <div className="h-16 w-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={18} outerRadius={28} stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="p-4 neu-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Impedimentos Ativos</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{blockedActivities}</p>
              <p className="text-[11px] text-muted-foreground">tarefas travadas</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500/60" />
          </div>
        </Card>

        <Card className="p-4 neu-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Colaboradores em Risco</p>
              <p className="text-3xl font-bold mt-1 text-amber-500">{overloadedCount}</p>
              <p className="text-[11px] text-muted-foreground">com sobrecarga</p>
            </div>
            <Users className="h-8 w-8 text-amber-500/60" />
          </div>
        </Card>

        <Card className="p-4 neu-card">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Concluído vs Planejado</p>
                <p className="text-2xl font-bold mt-1">
                  {doneActivities}/{totalActivities}
                </p>
              </div>
              <Target className="h-8 w-8 text-primary/60" />
            </div>
            <Progress value={totalActivities ? (doneActivities / totalActivities) * 100 : 0} />
          </div>
        </Card>
      </div>

      {/* Layer 2: Sprint vs Cascade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="p-4 neu-card xl:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold">Burndown — Sprint Atual</h3>
              <p className="text-xs text-muted-foreground">
                {currentSprint?.name ?? "Sem sprint vigente"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                sprintHealth.color === "emerald"
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                  : sprintHealth.color === "amber"
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                  : sprintHealth.color === "red"
                  ? "border-red-500/40 text-red-600 bg-red-500/10"
                  : ""
              }
            >
              {sprintHealth.label}
            </Badge>
          </div>
          <div className="h-56">
            {burndownData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="planejado" stroke="hsl(217 91% 60%)" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="realizado" stroke="hsl(142 71% 45%)" dot={{ r: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sem itens de sprint para exibir
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 neu-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Saúde das Fases (Cascata)</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => goToTab("projects")}>
              Ver Cronograma <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {phaseRows.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma sprint cadastrada no escopo.</p>
            )}
            {phaseRows.map(({ sprint, pct, daysLeft, color }) => (
              <div key={sprint.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{sprint.name}</span>
                  <span
                    className={
                      color === "red"
                        ? "text-red-500"
                        : color === "amber"
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }
                  >
                    {daysLeft === null
                      ? "—"
                      : daysLeft < 0
                      ? `${Math.abs(daysLeft)}d atrasado`
                      : `${daysLeft}d restantes`}{" "}
                    · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={
                      "h-full rounded-full " +
                      (color === "red"
                        ? "bg-red-500"
                        : color === "amber"
                        ? "bg-amber-500"
                        : "bg-emerald-500")
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Layer 3: Workload + Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 neu-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Radar de Carga do Time</h3>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {memberLoad.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem membros cadastrados.</p>
            )}
            {memberLoad
              .sort((a, b) => b.pct - a.pct)
              .map(({ member, count, pct }) => {
                const last = lastDailyByMember[member.id];
                const color = pct > 100 ? "red" : pct >= 75 ? "amber" : "emerald";
                return (
                  <div key={member.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {member.role} · {count} tarefa{count !== 1 ? "s" : ""} ativa{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className={
                          color === "red"
                            ? "text-red-500 font-semibold"
                            : color === "amber"
                            ? "text-amber-500 font-semibold"
                            : "text-emerald-500 font-semibold"
                        }
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={
                          "h-full " +
                          (color === "red"
                            ? "bg-red-500"
                            : color === "amber"
                            ? "bg-amber-500"
                            : "bg-emerald-500")
                        }
                        style={{ width: `${Math.min(140, pct)}%` }}
                      />
                    </div>
                    {last && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Última daily: {last.summary?.slice(0, 80) || "—"}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>

        <Card className="p-4 neu-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Top 5 Gargalos Críticos</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => goToTab("tasks")}>
              Ver Detalhes <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {topBottlenecks.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem gargalos críticos no momento. 🎉</p>
            )}
            {topBottlenecks.map(({ a, daysLate }) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{a.task}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {productNameMap[a.product_id] ?? "—"} ·{" "}
                    {(a.responsible_ids ?? []).map((id) => memberNameMap[id]).filter(Boolean).join(", ") || "Sem dono"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    a.status === "blocked"
                      ? "border-red-500/40 text-red-600 bg-red-500/10"
                      : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                  }
                >
                  {a.status === "blocked" ? "Travado" : `${daysLate}d atraso`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
