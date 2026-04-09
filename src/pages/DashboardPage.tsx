import { useBacklogs } from "@/hooks/useBacklogs";
import {
  CheckCircle2,
  Clock,
  Code2,
  AlertCircle,
  TrendingUp,
  Timer,
  Microscope,
  ArrowLeftRight,
  UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ label, value, secondary, icon: Icon, accent }: any) {
  return (
    <motion.div className="neu-card rounded-2xl p-5 border hover:border-primary/30 transition">
      <div className="flex justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && <span className="text-[10px] font-bold">{secondary}</span>}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: rawBacklogs = [], isLoading } = useBacklogs();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name");
      return data || [];
    },
  });

  const profilesMap = profiles.reduce((acc: any, p: any) => {
    acc[p.user_id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
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
      const priority = b.prioritization?.priority || "medium";
      const complexity = b.complexity || "Média";
      const area = b.effort_area || "Geral";
      const estimate = b.refinement?.estimate || 0;
      const isFinished = b.phase === "finished";

      const days = getDays(b.created_at);

      // BASE
      acc.totalItems++;
      acc.totalLeadTime += days;
      acc.totalHours += estimate;
      if (days > 7) acc.aging++;

      // FASE
      acc.phase[b.phase] = (acc.phase[b.phase] || 0) + 1;
      acc.phaseTime[b.phase] = (acc.phaseTime[b.phase] || 0) + days;

      // WIP
      if (!isFinished) acc.wip++;
      if (isFinished) acc.done++;

      // WIP por fase
      if (!isFinished) acc.wipByPhase[b.phase] = (acc.wipByPhase[b.phase] || 0) + 1;

      // USERS (mantido + enriquecido)
      if (!acc.users[user]) {
        acc.users[user] = {
          created: 0,
          approved: 0,
          refFunc: 0,
          refTech: 0,
          prioritized: 0,
          finished: 0,
          wip: 0,
        };
      }

      acc.users[user].created++;

      if (b.phase === "approval") acc.users[user].approved++;
      if (b.phase === "functional_refinement") acc.users[user].refFunc++;
      if (b.phase === "technical_refinement") acc.users[user].refTech++;
      if (b.phase === "available") acc.users[user].prioritized++;

      if (isFinished) acc.users[user].finished++;
      else acc.users[user].wip++;

      // PRODUCTS
      if (!acc.products[product]) acc.products[product] = { total: 0, finished: 0, hours: 0 };
      acc.products[product].total++;
      acc.products[product].hours += estimate;
      if (isFinished) acc.products[product].finished++;

      // CLIENTS
      if (!acc.clients[client]) acc.clients[client] = { total: 0, finished: 0, hours: 0 };
      acc.clients[client].total++;
      acc.clients[client].hours += estimate;
      if (isFinished) acc.clients[client].finished++;

      // PRIORITY
      if (!acc.priorities[priority]) acc.priorities[priority] = { total: 0, finished: 0 };
      acc.priorities[priority].total++;
      if (isFinished) acc.priorities[priority].finished++;

      // AREA / COMPLEXIDADE
      acc.areas[area] = (acc.areas[area] || 0) + 1;
      acc.complexities[complexity] = (acc.complexities[complexity] || 0) + 1;

      return acc;
    },
    {
      users: {},
      products: {},
      clients: {},
      priorities: {},
      areas: {},
      complexities: {},
      phase: {},
      phaseTime: {},
      wipByPhase: {},
      totalItems: 0,
      totalLeadTime: 0,
      totalHours: 0,
      aging: 0,
      wip: 0,
      done: 0,
    },
  );

  if (isLoading) return <div className="p-10 text-center">Carregando...</div>;

  // DERIVADOS
  const leadTime = Math.round(stats.totalLeadTime / (stats.totalItems || 1));
  const throughput = stats.done;
  const avgPerDay = throughput / 30;
  const remaining = stats.wip;
  const daysToFinish = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : 0;

  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + daysToFinish);

  const bottleneck = Object.entries(stats.phaseTime).sort((a: any, b: any) => b[1] - a[1])[0];

  return (
    <div className="space-y-8 pb-10">
      {/* INSIGHT */}
      <div className="neu-card p-5 rounded-2xl">
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Insight automático</p>
        <p className="text-sm font-semibold">
          {stats.aging > stats.totalItems * 0.3
            ? "⚠️ Alto volume de itens envelhecendo"
            : bottleneck
              ? `🚨 Gargalo principal: ${bottleneck[0]}`
              : "Fluxo saudável"}
        </p>
      </div>

      <Tabs defaultValue="strategic">
        <TabsList className="mb-6 flex gap-2 flex-wrap">
          <TabsTrigger value="strategic">Estratégico</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentação</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
        </TabsList>

        {/* ESTRATÉGICO */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <KpiCard label="WIP" value={stats.wip} icon={Microscope} />
            <KpiCard label="Throughput" value={throughput} icon={ArrowLeftRight} />
            <KpiCard label="Lead Time" value={`${leadTime}d`} icon={Timer} />
            <KpiCard label="Horas" value={`${stats.totalHours}h`} icon={Clock} />
            <KpiCard
              label="Previsão"
              value={`${daysToFinish} dias`}
              secondary={forecastDate.toLocaleDateString("pt-BR")}
              icon={TrendingUp}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard label="Aging" value={stats.aging} icon={AlertCircle} accent="bg-red-500/10 text-red-500" />
          </div>

          {/* GARGALO */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-4 text-red-500">Gargalo por etapa</h3>

            {Object.entries(stats.phaseTime).map(([phase, val]: any) => (
              <div key={phase} className="mb-3">
                <div className="flex justify-between text-xs">
                  <span>{phase}</span>
                  <span>{val} dias</span>
                </div>

                <div className="h-2 bg-secondary rounded">
                  <div className="h-2 bg-red-500" style={{ width: `${(val / stats.totalLeadTime) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="users" className="space-y-6">
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-6">Performance por Usuário</h3>

            {Object.entries(stats.users).map(([user, d]: any) => {
              const efficiency = Math.round((d.finished / (d.created || 1)) * 100);
              const participation = Math.round((d.created / stats.totalItems) * 100);

              return (
                <div key={user} className="mb-5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{user}</span>
                    <span>{d.created} itens</span>
                  </div>

                  <div className="h-2 bg-secondary rounded mt-1">
                    <div className="h-2 bg-primary" style={{ width: `${participation}%` }} />
                  </div>

                  <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                    <span>✔ {d.finished}</span>
                    <span>⚙ {d.wip}</span>
                    <span>🎯 {efficiency}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* SEGMENTAÇÃO (mantido) */}
        <TabsContent value="segmentation">{/* mantém seu layout original aqui */}</TabsContent>

        {/* OPERACIONAL */}
        <TabsContent value="operational" className="space-y-6">
          {/* WIP POR FASE */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-6">WIP por Etapa</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.wipByPhase).map(([phase, val]: any) => (
                <div key={phase} className="text-center">
                  <p className="text-xl font-black">{val}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{phase}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
