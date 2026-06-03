import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import type { Sprint } from "@/types/sprint";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface Props {
  sprint: Sprint;
}

export function SprintScopeAnalysis({ sprint }: Props) {
  const { data: members = [] } = useTeamMembers();
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["sprint_scope_activities", sprint.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_backlog_items") as any)
        .select("id, task, status, created_at, deadline_date, sprint_id, responsible_id")
        .eq("sprint_id", sprint.id);
      if (error) throw error;
      return data as Array<{ id: string; task: string; status: string; created_at: string; deadline_date: string | null; responsible_id: string | null }>;
    },
  });

  const startMs = new Date(sprint.start_date).getTime();
  const endMs = new Date(sprint.end_date).getTime();

  const planned = activities.filter((a) => new Date(a.created_at).getTime() <= startMs);
  const entrants = activities
    .filter((a) => new Date(a.created_at).getTime() > startMs)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const chartData = useMemo(() => {
    const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
    const baseline = planned.length;
    const points: Array<{ day: string; planejado: number; escopoAtual: number; entrantes: number }> = [];
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(startMs + i * 86400000);
      const dIso = d.toISOString().slice(0, 10);
      const enteredByDay = entrants.filter((a) => a.created_at.slice(0, 10) <= dIso).length;
      points.push({
        day: dIso.slice(5),
        planejado: baseline,
        escopoAtual: baseline + enteredByDay,
        entrantes: enteredByDay,
      });
    }
    return points;
  }, [planned.length, entrants, startMs, endMs]);

  const scopeChange = activities.length - planned.length;
  const scopeChangePct = planned.length ? Math.round((scopeChange / planned.length) * 100) : 0;

  const workload = useMemo(() => {
    const counts = new Map<string | null, { total: number; open: number }>();
    activities.forEach((a) => {
      const key = a.responsible_id;
      const cur = counts.get(key) ?? { total: 0, open: 0 };
      cur.total += 1;
      if (a.status !== "done") cur.open += 1;
      counts.set(key, cur);
    });
    const rows = Array.from(counts.entries()).map(([id, c]) => ({
      id,
      name: id ? members.find((m) => m.id === id)?.name ?? "—" : "Não atribuído",
      total: c.total,
      open: c.open,
    }));
    rows.sort((a, b) => b.open - a.open);
    return rows;
  }, [activities, members]);

  const loadLabel = (open: number) => {
    if (open === 0) return { label: "Sem atividades", cls: "border-muted text-muted-foreground bg-muted/30" };
    if (open <= 3) return { label: "Saudável", cls: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" };
    if (open <= 6) return { label: "Atenção", cls: "border-amber-500/40 text-amber-600 bg-amber-500/10" };
    return { label: "Sobrecarregado", cls: "border-red-500/40 text-red-600 bg-red-500/10" };
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando análise de escopo...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Escopo planejado</p>
          <p className="text-2xl font-bold mt-1">{planned.length}</p>
          <p className="text-[11px] text-muted-foreground">atividades antes do início</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Entrantes pós-início</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{entrants.length}</p>
          <p className="text-[11px] text-muted-foreground">fora do planejado</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Variação de escopo</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold">{scopeChange >= 0 ? "+" : ""}{scopeChange}</p>
            <Badge
              variant="outline"
              className={
                scopeChangePct > 20
                  ? "border-red-500/40 text-red-600 bg-red-500/10"
                  : scopeChangePct > 0
                    ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                    : "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              }
            >
              {scopeChangePct >= 0 ? "+" : ""}{scopeChangePct}%
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">em relação ao planejado</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Evolução do Escopo</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="planejado" stroke="hsl(217 91% 60%)" strokeDasharray="4 4" dot={false} name="Planejado" />
              <Line type="monotone" dataKey="escopoAtual" stroke="hsl(38 92% 50%)" dot={{ r: 2 }} name="Escopo atual" />
              <Line type="monotone" dataKey="entrantes" stroke="hsl(0 84% 60%)" dot={{ r: 2 }} name="Entrantes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Carga por colaborador</h3>
          <Badge variant="outline" className="ml-auto">{workload.length}</Badge>
        </div>
        {workload.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atividades nesta sprint.</p>
        ) : (
          <ul className="space-y-2">
            {workload.map((w) => {
              const ind = loadLabel(w.open);
              return (
                <li key={w.id ?? "none"} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 text-sm">
                  <span className="truncate flex-1 font-medium">{w.name}</span>
                  <span className="text-xs text-muted-foreground">{w.open} abertas / {w.total} total</span>
                  <Badge variant="outline" className={ind.cls}>{ind.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Atividades entrantes após o início</h3>
          <Badge variant="outline" className="ml-auto">{entrants.length}</Badge>
        </div>
        {entrants.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma atividade foi adicionada após o início da sprint.</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {entrants.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 text-sm">
                <span className="truncate flex-1">{a.task}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  +{format(parseISO(a.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}