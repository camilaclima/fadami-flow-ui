import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import {
  CheckCircle2,
  Clock,
  FileSearch,
  Code2,
  AlertCircle,
  Zap,
  Target,
  Activity,
  Users,
  Timer,
  Gauge,
  ChevronRight,
  BarChart3,
  Layers,
  Recycle,
  Ban,
  Microscope,
  ArrowLeftRight,
  UserCheck,
  Briefcase,
  TrendingUp,
  Box,
  Monitor,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ label, value, secondary, icon: Icon, delay, accent, description }: any) {
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
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight leading-none mt-1">
          {label}
        </p>
        {description && <p className="text-[9px] text-muted-foreground/50 mt-2 leading-none">{description}</p>}
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
  const finishedCount = backlogs.filter((b) => b.phase === "finished").length;

  const stats = backlogs.reduce(
    (acc: any, b) => {
      const userId = b.created_by || b.createdBy;
      const userName = profilesMap[userId] || (userId ? `User: ${userId.slice(0, 4)}` : "Sistema");
      const product = b.product_name || b.product || "Sem Produto";
      const client = b.client_name || b.client || "Sem Cliente";
      const area = b.effort_area || "Geral";
      const complexity = b.complexity || "Média";
      const priority = b.prioritization?.priority || "medium";
      const estimate = b.refinement?.estimate || 0;

      if (!acc.users[userName]) acc.users[userName] = { total: 0, byPhase: {} };
      if (!acc.products[product]) acc.products[product] = { total: 0, hours: 0, byStatus: {} };
      if (!acc.clients[client]) acc.clients[client] = { total: 0, hours: 0, byStatus: {} };
      if (!acc.priority[priority]) acc.priority[priority] = { total: 0, byStatus: {} };
      if (!acc.areas[area]) acc.areas[area] = 0;
      if (!acc.complexities[complexity]) acc.complexities[complexity] = 0;

      acc.users[userName].total += 1;
      acc.users[userName].byPhase[b.phase] = (acc.users[userName].byPhase[b.phase] || 0) + 1;

      acc.products[product].total += 1;
      acc.products[product].hours += estimate;
      acc.products[product].byStatus[b.phase] = (acc.products[product].byStatus[b.phase] || 0) + 1;

      acc.clients[client].total += 1;
      acc.clients[client].hours += estimate;
      acc.clients[client].byStatus[b.phase] = (acc.clients[client].byStatus[b.phase] || 0) + 1;

      acc.priority[priority].total += 1;
      acc.priority[priority].byStatus[b.phase] = (acc.priority[priority].byStatus[b.phase] || 0) + 1;

      acc.areas[area] += 1;
      acc.complexities[complexity] += 1;

      return acc;
    },
    {
      users: {},
      products: {},
      clients: {},
      priority: {},
      areas: {},
      complexities: {},
    },
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando indicadores...</div>;

  return (
    <div className="fade-in space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">FadamiFlow Insights</h1>
        <p className="text-sm text-muted-foreground">Visão Multi-dimensional: Clientes, Produtos e Time</p>
      </div>

      <Tabs defaultValue="tatico" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="strategic" className="rounded-xl px-4 py-2 gap-2">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="rounded-xl px-4 py-2 gap-2">
            <Users className="w-4 h-4" /> Produtividade/Time
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="rounded-xl px-4 py-2 gap-2">
            <Box className="w-4 h-4" /> Produto & Cliente
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-4 py-2 gap-2">
            <Activity className="w-4 h-4" /> Carga & Esforço
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tatico" className="space-y-6">
          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase mb-6 flex items-center gap-2 text-primary tracking-tighter">
              <UserCheck className="w-4 h-4" /> Atuação por Etapa e Usuário
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 text-[10px] font-black uppercase text-muted-foreground">Usuário</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-muted-foreground">Total</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-sky-500">Aprovação</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-indigo-500">Ref. Func</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-primary">Ref. Técn</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-emerald-500">Prontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(stats.users).map(([name, data]: any) => (
                    <tr key={name} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-4 text-xs font-bold uppercase">{name}</td>
                      <td className="py-4 text-center text-sm font-black">{data?.total || 0}</td>
                      <td className="py-4 text-center text-sm font-bold text-sky-500">
                        {data?.byPhase?.approval || 0}
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-indigo-500">
                        {data?.byPhase?.functional_refinement || 0}
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-primary">
                        {data?.byPhase?.technical_refinement || 0}
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-emerald-500">
                        {data?.byPhase?.available || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segmentation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-primary tracking-tighter">
                <Box className="w-4 h-4" /> Progresso por Produto
              </h3>
              <div className="space-y-4">
                {Object.entries(stats.products).map(([name, data]: any) => (
                  <div key={name}>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span>
                        {name} ({data.total})
                      </span>
                      <span className="text-primary">{data.hours}h</span>
                    </div>
                    <div className="flex h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${((data?.byPhase?.finished || 0) / (data.total || 1)) * 100}%` }}
                        className="bg-emerald-500"
                      />
                      <div
                        style={{
                          width: `${((data.total - (data?.byPhase?.finished || 0)) / (data.total || 1)) * 100}%`,
                        }}
                        className="bg-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-sky-500 tracking-tighter">
                <Users className="w-4 h-4" /> Progresso por Cliente
              </h3>
              <div className="space-y-4">
                {Object.entries(stats.clients).map(([name, data]: any) => (
                  <div key={name}>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span>
                        {name} ({data.total})
                      </span>
                      <span>{data.hours}h</span>
                    </div>
                    <div className="flex h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${((data?.byPhase?.finished || 0) / (data.total || 1)) * 100}%` }}
                        className="bg-emerald-500"
                      />
                      <div
                        style={{
                          width: `${((data.total - (data?.byPhase?.finished || 0)) / (data.total || 1)) * 100}%`,
                        }}
                        className="bg-sky-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Complexidade: Alta"
              value={stats.complexities["Alta"] || 0}
              icon={Zap}
              accent="bg-rose-500/10 text-rose-500"
            />
            <KpiCard
              label="Prioridade: Alta"
              value={stats.priority["high"]?.total || 0}
              icon={AlertCircle}
              accent="bg-orange-500/10 text-orange-500"
            />
            <KpiCard label="Área: Backend" value={stats.areas["Backend"] || 0} icon={Code2} />
            <KpiCard label="Área: Frontend" value={stats.areas["Frontend"] || 0} icon={Monitor} />
          </div>
        </TabsContent>

        <TabsContent value="strategic">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Alinhamento" value="85%" icon={Target} />
            <KpiCard label="Lead Time" value="14d" icon={Timer} />
            <KpiCard label="Throughput" value={finishedCount} icon={ArrowLeftRight} />
            <KpiCard label="Eficiência" value="92%" icon={Gauge} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
