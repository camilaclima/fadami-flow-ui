import { useBacklogs } from "@/hooks/useBacklogs";
import {
  CheckCircle2,
  Clock,
  Code2,
  AlertCircle,
  Target,
  Users,
  Timer,
  Gauge,
  Box,
  TrendingUp,
  UserCheck,
  Microscope,
  ArrowLeftRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ label, value, secondary, icon: Icon, accent }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="neu-card rounded-2xl p-5 border-l-4 hover:border-l-primary transition-all"
    >
      <div className="flex justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && <span className="text-[10px] font-bold text-primary">{secondary}</span>}
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
    acc[p.user_id] = `${p.first_name || ""} ${p.last_name || ""}`;
    return acc;
  }, {});

  const backlogs = rawBacklogs as any[];

  const now = new Date();
  const getDays = (date: string) => (date ? Math.floor((now.getTime() - new Date(date).getTime()) / 86400000) : 0);

  const stats = backlogs.reduce(
    (acc: any, b) => {
      const user = profilesMap[b.created_by] || "Sistema";
      const product = b.product_name || "Sem Produto";
      const client = b.client_name || "Sem Cliente";
      const priority = b.prioritization?.priority || "medium";
      const estimate = b.refinement?.estimate || 0;
      const isFinished = b.phase === "finished";

      const days = getDays(b.created_at);

      acc.totalLeadTime += days;
      acc.totalItems += 1;
      if (days > 7) acc.aging += 1;

      acc.phaseTime[b.phase] = (acc.phaseTime[b.phase] || 0) + days;
      if (!isFinished) acc.wipByPhase[b.phase] = (acc.wipByPhase[b.phase] || 0) + 1;

      if (!acc.users[user]) acc.users[user] = { created: 0 };
      acc.users[user].created++;

      if (!acc.products[product]) acc.products[product] = { total: 0, finished: 0, hours: 0 };
      acc.products[product].total++;
      acc.products[product].hours += estimate;
      if (isFinished) acc.products[product].finished++;

      if (!acc.clients[client]) acc.clients[client] = { total: 0, finished: 0 };
      acc.clients[client].total++;
      if (isFinished) acc.clients[client].finished++;

      if (!acc.priorities[priority]) acc.priorities[priority] = 0;
      acc.priorities[priority]++;

      acc.totalHours += estimate;

      return acc;
    },
    {
      users: {},
      products: {},
      clients: {},
      priorities: {},
      totalLeadTime: 0,
      totalItems: 0,
      aging: 0,
      phaseTime: {},
      wipByPhase: {},
      totalHours: 0,
    },
  );

  if (isLoading) return <div className="p-10">Carregando...</div>;

  const throughput = backlogs.filter((b) => b.phase === "finished").length;
  const avgPerDay = throughput / 30;
  const remaining = backlogs.filter((b) => b.phase !== "finished").length;
  const daysToFinish = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : 0;

  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + daysToFinish);

  const leadTime = Math.round(stats.totalLeadTime / (stats.totalItems || 1));

  return (
    <div className="space-y-8 pb-10">
      {/* INSIGHT */}
      <div className="neu-card p-5 rounded-2xl">
        <p className="text-xs uppercase font-bold text-muted-foreground">Insight</p>
        <p className="text-sm font-semibold">
          {stats.aging > backlogs.length * 0.3 ? "⚠️ Muitos itens envelhecendo" : "Fluxo saudável 🚀"}
        </p>
      </div>

      <Tabs defaultValue="strategic">
        <TabsList>
          <TabsTrigger value="strategic">Estratégico</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentação</TabsTrigger>
        </TabsList>

        {/* ESTRATÉGICO */}
        <TabsContent value="strategic">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="WIP" value={remaining} icon={Microscope} />
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
        </TabsContent>

        {/* SEGMENTAÇÃO VISUAL */}
        <TabsContent value="segmentation" className="space-y-6">
          {/* PRODUTOS */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-6">Produtos</h3>

            {Object.entries(stats.products).map(([name, d]: any) => {
              const percent = (d.finished / d.total) * 100;

              return (
                <div key={name} className="mb-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{name}</span>
                    <span>{d.hours}h</span>
                  </div>

                  <div className="h-3 bg-gray-200 rounded-full mt-1">
                    <div className="h-3 bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* CLIENTES */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-6">Clientes</h3>

            {Object.entries(stats.clients).map(([name, d]: any) => {
              const percent = (d.finished / d.total) * 100;

              return (
                <div key={name} className="mb-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{name}</span>
                    <span>{d.total}</span>
                  </div>

                  <div className="h-3 bg-gray-200 rounded-full mt-1">
                    <div className="h-3 bg-sky-500 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* PRIORIDADES */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-6">Prioridades</h3>

            {Object.entries(stats.priorities).map(([name, val]: any) => {
              const percent = (val / backlogs.length) * 100;

              return (
                <div key={name} className="mb-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{name}</span>
                    <span>{val}</span>
                  </div>

                  <div className="h-3 bg-gray-200 rounded-full mt-1">
                    <div className="h-3 bg-orange-500 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
