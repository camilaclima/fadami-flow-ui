import { useBacklogs } from "@/hooks/useBacklogs";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Timer,
  TrendingUp,
  Microscope,
  ArrowLeftRight,
  Layers,
  Activity,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ label, value, secondary, icon: Icon }: any) {
  return (
    <motion.div className="neu-card rounded-2xl p-5 border hover:border-primary/30 transition">
      <div className="flex justify-between mb-2">
        <Icon className="w-4 h-4" />
        {secondary && <span className="text-[10px]">{secondary}</span>}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: rawBacklogs = [], isLoading } = useBacklogs();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const profilesMap = profiles.reduce((acc: any, p: any) => {
    acc[p.user_id] = `${p.first_name} ${p.last_name}`;
    return acc;
  }, {});

  const backlogs = rawBacklogs as any[];

  const now = new Date();
  const getDays = (date: string) => (date ? Math.floor((now.getTime() - new Date(date).getTime()) / 86400000) : 0);

  const stats = backlogs.reduce(
    (acc: any, b: any) => {
      const user = profilesMap[b.created_by] || "Sistema";
      const product = b.product_name || "Sem Produto";
      const client = b.client_name || "Sem Cliente";
      const priority = b.prioritization?.priority || "Média";
      const complexity = b.complexity || "Média";
      const area = b.effort_area || "Geral";
      const estimate = b.refinement?.estimate || 0;
      const isFinished = b.phase === "finished";
      const days = getDays(b.created_at);

      acc.total++;
      acc.hours += estimate;
      acc.lead += days;
      if (days > 7) acc.aging++;

      if (isFinished) acc.done++;
      else acc.wip++;

      acc.phaseTime[b.phase] = (acc.phaseTime[b.phase] || 0) + days;
      if (!isFinished) acc.wipPhase[b.phase] = (acc.wipPhase[b.phase] || 0) + 1;

      if (!acc.users[user]) acc.users[user] = { created: 0, finished: 0 };
      acc.users[user].created++;
      if (isFinished) acc.users[user].finished++;

      if (!acc.products[product]) acc.products[product] = { total: 0, finished: 0, hours: 0 };
      acc.products[product].total++;
      acc.products[product].hours += estimate;
      if (isFinished) acc.products[product].finished++;

      if (!acc.clients[client]) acc.clients[client] = { total: 0, finished: 0 };
      acc.clients[client].total++;
      if (isFinished) acc.clients[client].finished++;

      acc.priorities[priority] = (acc.priorities[priority] || 0) + 1;
      acc.areas[area] = (acc.areas[area] || 0) + 1;
      acc.complexities[complexity] = (acc.complexities[complexity] || 0) + 1;

      return acc;
    },
    {
      total: 0,
      hours: 0,
      lead: 0,
      aging: 0,
      done: 0,
      wip: 0,
      users: {},
      products: {},
      clients: {},
      priorities: {},
      areas: {},
      complexities: {},
      phaseTime: {},
      wipPhase: {},
    },
  );

  if (isLoading) return <div className="p-10">Carregando...</div>;

  const leadTime = Math.round(stats.lead / (stats.total || 1));
  const throughput = stats.done;
  const avgDay = throughput / 30;
  const forecastDays = avgDay ? Math.ceil(stats.wip / avgDay) : 0;

  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + forecastDays);

  const bottleneck = Object.entries(stats.phaseTime).sort((a: any, b: any) => b[1] - a[1])[0];

  return (
    <div className="space-y-8 pb-10">
      {/* COCKPIT */}
      <div>
        <h2 className="text-lg font-black mb-4">Cockpit</h2>

        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
          <KpiCard label="Total" value={stats.total} icon={Layers} />
          <KpiCard label="WIP" value={stats.wip} icon={Microscope} />
          <KpiCard label="Done" value={stats.done} icon={CheckCircle2} />
          <KpiCard label="Lead Time" value={`${leadTime}d`} icon={Timer} />
          <KpiCard label="Aging" value={stats.aging} icon={AlertCircle} />
          <KpiCard label="Horas" value={`${stats.hours}h`} icon={Clock} />
          <KpiCard
            label="Previsão"
            value={`${forecastDays}d`}
            secondary={forecastDate.toLocaleDateString("pt-BR")}
            icon={TrendingUp}
          />
        </div>

        <div className="mt-4 text-sm font-semibold">
          {stats.aging > stats.total * 0.3
            ? "⚠️ Muitos itens envelhecendo"
            : bottleneck
              ? `🚨 Gargalo: ${bottleneck[0]}`
              : "Fluxo saudável"}
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="analysis">
        <TabsList className="mb-6">
          <TabsTrigger value="analysis">Análises</TabsTrigger>
          <TabsTrigger value="flow">Fluxo</TabsTrigger>
        </TabsList>

        {/* ANALYSES */}
        <TabsContent value="analysis" className="space-y-6">
          {/* USERS */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="font-black mb-4">Usuários</h3>

            {Object.entries(stats.users).map(([u, d]: any) => {
              const eff = Math.round((d.finished / (d.created || 1)) * 100);
              const part = Math.round((d.created / stats.total) * 100);

              return (
                <div key={u} className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span>{u}</span>
                    <span>{d.created}</span>
                  </div>

                  <div className="h-2 bg-secondary rounded mt-1">
                    <div className="h-2 bg-primary" style={{ width: `${part}%` }} />
                  </div>

                  <div className="text-xs flex justify-between mt-1">
                    <span>✔ {d.finished}</span>
                    <span>🎯 {eff}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SEGMENTOS */}
          {[stats.products, stats.clients, stats.priorities, stats.areas, stats.complexities].map((group: any, i) => (
            <div key={i} className="neu-card p-6 rounded-3xl">
              <h3 className="font-black mb-4">Distribuição</h3>

              {Object.entries(group).map(([k, v]: any) => {
                const val = v.total || v;
                const pct = (val / stats.total) * 100;

                return (
                  <div key={k} className="mb-3">
                    <div className="flex justify-between text-xs">
                      <span>{k}</span>
                      <span>{val}</span>
                    </div>

                    <div className="h-2 bg-secondary rounded">
                      <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </TabsContent>

        {/* FLOW */}
        <TabsContent value="flow" className="space-y-6">
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="font-black mb-4">Gargalo</h3>

            {Object.entries(stats.phaseTime).map(([p, v]: any) => (
              <div key={p} className="mb-3">
                <div className="flex justify-between text-xs">
                  <span>{p}</span>
                  <span>{v} dias</span>
                </div>

                <div className="h-2 bg-secondary rounded">
                  <div className="h-2 bg-red-500" style={{ width: `${(v / stats.lead) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.wipPhase).map(([p, v]: any) => (
              <div key={p} className="neu-card p-4 rounded-2xl text-center">
                <p className="text-xl font-black">{v}</p>
                <p className="text-[10px] uppercase">{p}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
