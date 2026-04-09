import { useBacklogs } from "@/hooks/useBacklogs";
import {
  CheckCircle2,
  Clock,
  Code2,
  AlertCircle,
  Target,
  Timer,
  TrendingUp,
  Microscope,
  ArrowLeftRight,
  Layers,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function KpiCard({ label, value, icon: Icon, accent }: any) {
  return (
    <motion.div className="neu-card rounded-2xl p-5 flex flex-col gap-2 border hover:border-primary/30 transition">
      <div className={`w-8 h-8 rounded-lg ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: backlogs = [] } = useBacklogs();

  const now = new Date();

  const getDays = (date: string) => (date ? Math.floor((now.getTime() - new Date(date).getTime()) / 86400000) : 0);

  const stats = backlogs.reduce(
    (acc: any, b: any) => {
      const days = getDays(b.created_at);
      const estimate = b.refinement?.estimate || 0;
      const finished = b.phase === "finished";

      acc.totalItems++;
      acc.totalLeadTime += days;
      acc.totalHours += estimate;

      if (days > 7) acc.aging++;

      if (!finished) acc.wip++;

      if (finished) acc.done++;

      acc.phase[b.phase] = (acc.phase[b.phase] || 0) + 1;

      acc.phaseTime[b.phase] = (acc.phaseTime[b.phase] || 0) + days;

      acc.priority[b.prioritization?.priority || "medium"] =
        (acc.priority[b.prioritization?.priority || "medium"] || 0) + 1;

      acc.area[b.effort_area || "Geral"] = (acc.area[b.effort_area || "Geral"] || 0) + 1;

      return acc;
    },
    {
      totalItems: 0,
      totalLeadTime: 0,
      totalHours: 0,
      aging: 0,
      wip: 0,
      done: 0,
      phase: {},
      phaseTime: {},
      priority: {},
      area: {},
    },
  );

  const leadTime = Math.round(stats.totalLeadTime / (stats.totalItems || 1));
  const throughput = stats.done;
  const avgPerDay = throughput / 30;
  const daysToFinish = avgPerDay ? Math.ceil(stats.wip / avgPerDay) : 0;

  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + daysToFinish);

  const bottleneck = Object.entries(stats.phaseTime).sort((a: any, b: any) => b[1] - a[1])[0];

  return (
    <div className="space-y-8">
      {/* KPI TOP */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard label="Backlogs" value={stats.totalItems} icon={Layers} />
        <KpiCard label="WIP" value={stats.wip} icon={Microscope} />
        <KpiCard label="Finalizados" value={stats.done} icon={CheckCircle2} />
        <KpiCard label="Lead Time" value={`${leadTime}d`} icon={Timer} />
        <KpiCard label="Horas" value={`${stats.totalHours}h`} icon={Clock} />
        <KpiCard label="Aging" value={stats.aging} icon={AlertCircle} accent="bg-red-500/10 text-red-500" />
      </div>

      {/* PREVISÃO */}
      <div className="neu-card p-6 rounded-3xl flex justify-between items-center">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Previsão de Entrega</p>
          <p className="text-3xl font-black">{daysToFinish} dias</p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground">Data estimada</p>
          <p className="text-lg font-bold">{forecastDate.toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {/* GARGALO */}
      <div className="neu-card p-6 rounded-3xl">
        <h3 className="text-xs font-black mb-4 text-red-500">Gargalo do Fluxo</h3>

        {Object.entries(stats.phaseTime).map(([phase, val]: any) => (
          <div key={phase} className="mb-3">
            <div className="flex justify-between text-xs font-bold">
              <span>{phase}</span>
              <span>{val} dias</span>
            </div>

            <div className="h-2 bg-secondary rounded">
              <div className="h-2 bg-red-500 rounded" style={{ width: `${(val / stats.totalLeadTime) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="distribution">
        <TabsList>
          <TabsTrigger value="distribution">Distribuições</TabsTrigger>
          <TabsTrigger value="flow">Fluxo</TabsTrigger>
        </TabsList>

        {/* DISTRIBUIÇÕES */}
        <TabsContent value="distribution" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PRIORIDADE */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-4">Prioridade</h3>

            {Object.entries(stats.priority).map(([k, v]: any) => (
              <div key={k} className="mb-3">
                <div className="flex justify-between text-xs">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>

                <div className="h-2 bg-secondary rounded">
                  <div className="h-2 bg-orange-500" style={{ width: `${(v / stats.totalItems) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* ÁREA */}
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black mb-4">Área</h3>

            {Object.entries(stats.area).map(([k, v]: any) => (
              <div key={k} className="mb-3">
                <div className="flex justify-between text-xs">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>

                <div className="h-2 bg-secondary rounded">
                  <div className="h-2 bg-primary" style={{ width: `${(v / stats.totalItems) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* FLUXO */}
        <TabsContent value="flow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.phase).map(([phase, val]: any) => (
              <div key={phase} className="neu-card p-4 rounded-2xl text-center">
                <p className="text-xl font-black">{val}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{phase}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
