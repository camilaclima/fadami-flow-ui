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
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ label, value, secondary, icon: Icon, delay, accent }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card rounded-2xl p-5 border-l-4 border-l-transparent hover:border-l-primary transition-all flex flex-col justify-between h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && (
          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">{secondary}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: rawBacklogs = [], isLoading } = useBacklogs();
  const navigate = useNavigate();

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
  const getDays = (date: string) => {
    if (!date) return 0;
    return Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const stats = backlogs.reduce(
    (acc: any, b) => {
      const user = profilesMap[b.created_by || b.createdBy] || "Sistema";
      const product = b.product_name || "Sem Produto";
      const client = b.client_name || "Sem Cliente";
      const priority = b.prioritization?.priority || "medium";
      const complexity = b.complexity || "Média";
      const area = b.effort_area || "Geral";
      const estimate = b.refinement?.estimate || 0;
      const isFinished = b.phase === "finished";

      const createdAt = b.created_at || b.createdAt;
      const days = getDays(createdAt);

      acc.totalLeadTime += days;
      acc.totalItems += 1;
      if (days > 7) acc.aging += 1;

      acc.phaseTime[b.phase] = (acc.phaseTime[b.phase] || 0) + days;

      if (!isFinished) {
        acc.wipByPhase[b.phase] = (acc.wipByPhase[b.phase] || 0) + 1;
      }

      // USERS
      if (!acc.users[user]) acc.users[user] = { created: 0, approved: 0, refFunc: 0, refTech: 0, prioritized: 0 };
      acc.users[user].created += 1;
      if (b.phase === "approval") acc.users[user].approved += 1;
      if (b.phase === "functional_refinement") acc.users[user].refFunc += 1;
      if (b.phase === "technical_refinement") acc.users[user].refTech += 1;
      if (b.phase === "available") acc.users[user].prioritized += 1;

      // PRODUCTS
      if (!acc.products[product]) acc.products[product] = { total: 0, finished: 0, hours: 0 };
      acc.products[product].total += 1;
      acc.products[product].hours += estimate;
      if (isFinished) acc.products[product].finished += 1;

      // CLIENTS
      if (!acc.clients[client]) acc.clients[client] = { total: 0, finished: 0, hours: 0 };
      acc.clients[client].total += 1;
      acc.clients[client].hours += estimate;
      if (isFinished) acc.clients[client].finished += 1;

      // PRIORITY
      if (!acc.priorities[priority]) acc.priorities[priority] = { total: 0, finished: 0 };
      acc.priorities[priority].total += 1;
      if (isFinished) acc.priorities[priority].finished += 1;

      acc.areas[area] = (acc.areas[area] || 0) + 1;
      acc.complexities[complexity] = (acc.complexities[complexity] || 0) + 1;

      acc.totalHours += estimate;

      return acc;
    },
    {
      users: {},
      products: {},
      clients: {},
      priorities: {},
      areas: {},
      complexities: {},
      totalLeadTime: 0,
      totalItems: 0,
      aging: 0,
      phaseTime: {},
      wipByPhase: {},
      totalHours: 0,
    },
  );

  if (isLoading) return <div className="p-10 text-center">Carregando...</div>;

  const leadTime = Math.round(stats.totalLeadTime / (stats.totalItems || 1));
  const throughput = backlogs.filter((b) => b.phase === "finished").length;
  const completionRate = Math.round((throughput / (backlogs.length || 1)) * 100);

  const mainBottleneck = Object.entries(stats.phaseTime).sort((a: any, b: any) => b[1] - a[1])[0];

  return (
    <div className="space-y-8 pb-10">
      {/* INSIGHT */}
      <div className="neu-card p-5 rounded-2xl">
        <p className="text-xs uppercase font-bold text-muted-foreground mb-2">Insight automático</p>
        <p className="text-sm font-semibold">
          {stats.aging > backlogs.length * 0.3
            ? "⚠️ Muitos itens envelhecendo"
            : mainBottleneck
              ? `🚨 Gargalo em ${mainBottleneck[0]}`
              : "Fluxo saudável"}
        </p>
      </div>

      <Tabs defaultValue="strategic">
        <TabsList className="mb-6">
          <TabsTrigger value="strategic">Estratégico</TabsTrigger>
          <TabsTrigger value="tatico">Usuários</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentação</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
        </TabsList>

        {/* ESTRATÉGICO */}
        <TabsContent value="strategic">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="WIP"
              value={Object.values(stats.wipByPhase).reduce((a: any, b: any) => a + b, 0)}
              icon={Microscope}
            />
            <KpiCard label="Throughput" value={throughput} icon={ArrowLeftRight} />
            <KpiCard label="Lead Time" value={`${leadTime}d`} icon={Timer} />
            <KpiCard label="Conclusão" value={`${completionRate}%`} icon={Target} />
            <KpiCard label="Horas Totais" value={`${stats.totalHours}h`} icon={Clock} />
            <KpiCard label="Aging (+7d)" value={stats.aging} icon={AlertCircle} />
          </div>

          {/* GARGALO */}
          <div className="mt-6 neu-card p-6 rounded-2xl">
            <h3 className="text-xs font-bold mb-4">Gargalos</h3>
            {Object.entries(stats.phaseTime).map(([phase, val]: any) => (
              <div key={phase} className="mb-3">
                <div className="flex justify-between text-xs">
                  <span>{phase}</span>
                  <span>{val} dias</span>
                </div>
                <div className="h-2 bg-gray-200 rounded">
                  <div style={{ width: `${(val / stats.totalLeadTime) * 100}%` }} className="h-2 bg-red-500 rounded" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="tatico">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Criados</th>
                <th>Aprovados</th>
                <th>Ref Func</th>
                <th>Ref Tec</th>
                <th>Priorizados</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.users).map(([name, d]: any) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{d.created}</td>
                  <td>{d.approved}</td>
                  <td>{d.refFunc}</td>
                  <td>{d.refTech}</td>
                  <td>{d.prioritized}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        {/* SEGMENTAÇÃO */}
        <TabsContent value="segmentation">
          <div>
            <h3>Produtos</h3>
            {Object.entries(stats.products).map(([name, d]: any) => (
              <div key={name}>
                {name} ({d.total}) - {d.hours}h
              </div>
            ))}

            <h3 className="mt-4">Clientes</h3>
            {Object.entries(stats.clients).map(([name, d]: any) => (
              <div key={name}>
                {name} ({d.total})
              </div>
            ))}

            <h3 className="mt-4">Prioridade</h3>
            {Object.entries(stats.priorities).map(([name, d]: any) => (
              <div key={name}>
                {name} ({d.total})
              </div>
            ))}
          </div>
        </TabsContent>

        {/* OPERACIONAL */}
        <TabsContent value="operational">
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              label="Prontos"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
            />
            <KpiCard
              label="Ref Técnico"
              value={backlogs.filter((b) => b.phase === "functional_refinement").length}
              icon={Code2}
            />
          </div>

          <div className="mt-6">
            <h3>Áreas</h3>
            {Object.entries(stats.areas).map(([k, v]: any) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}

            <h3 className="mt-4">Complexidade</h3>
            {Object.entries(stats.complexities).map(([k, v]: any) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>

          {/* WIP POR ETAPA */}
          <div className="mt-6">
            <h3>WIP por etapa</h3>
            {Object.entries(stats.wipByPhase).map(([k, v]: any) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
