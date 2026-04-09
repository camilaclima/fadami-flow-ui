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
  Ban,
  Microscope,
  ArrowLeftRight,
  UserCheck,
  Briefcase,
  Box,
  Monitor,
  TrendingUp,
  UserPlus,
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
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight leading-none mt-1">
          {label}
        </p>
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

  // --- MOTOR DE CÁLCULO MULTIDIMENSIONAL ---
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

      // 1. Agrupamento por Usuário
      if (!acc.users[user]) acc.users[user] = { created: 0, approved: 0, refFunc: 0, refTech: 0, prioritized: 0 };
      acc.users[user].created += 1;
      if (b.phase === "approval") acc.users[user].approved += 1;
      if (b.phase === "functional_refinement") acc.users[user].refFunc += 1;
      if (b.phase === "technical_refinement") acc.users[user].refTech += 1;
      if (b.phase === "available") acc.users[user].prioritized += 1;

      // 2. Agrupamento por Produto
      if (!acc.products[product]) acc.products[product] = { total: 0, finished: 0, hours: 0 };
      acc.products[product].total += 1;
      acc.products[product].hours += estimate;
      if (isFinished) acc.products[product].finished += 1;

      // 3. Agrupamento por Cliente
      if (!acc.clients[client]) acc.clients[client] = { total: 0, finished: 0, hours: 0 };
      acc.clients[client].total += 1;
      acc.clients[client].hours += estimate;
      if (isFinished) acc.clients[client].finished += 1;

      // 4. Agrupamento por Prioridade
      if (!acc.priorities[priority]) acc.priorities[priority] = { total: 0, finished: 0 };
      acc.priorities[priority].total += 1;
      if (isFinished) acc.priorities[priority].finished += 1;

      // 5. Outros
      acc.areas[area] = (acc.areas[area] || 0) + 1;
      acc.complexities[complexity] = (acc.complexities[complexity] || 0) + 1;

      return acc;
    },
    { users: {}, products: {}, clients: {}, priorities: {}, areas: {}, complexities: {} },
  );

  if (isLoading)
    return (
      <div className="p-10 text-center animate-pulse font-black uppercase tracking-tighter">
        Carregando Data Warehouse...
      </div>
    );

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Fadami Cockpit</h1>
          <p className="text-xs text-muted-foreground uppercase font-bold">Inteligência Competitiva de Backlog</p>
        </div>
      </div>

      <Tabs defaultValue="tatico" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="strategic" className="rounded-xl px-4 py-2 gap-2">
            <TrendingUp className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="rounded-xl px-4 py-2 gap-2">
            <Users className="w-4 h-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="rounded-xl px-4 py-2 gap-2">
            <Box className="w-4 h-4" /> Produtos & Clientes
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-4 py-2 gap-2">
            <Gauge className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* --- ABA 1: ESTRATÉGICO (VALOR E WIP) --- */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Work in Progress (WIP)"
              value={backlogs.filter((b) => !["finished", "prioritization"].includes(b.phase)).length}
              icon={Microscope}
              accent="bg-indigo-500/10 text-indigo-500"
            />
            <KpiCard
              label="Throughput"
              value={backlogs.filter((b) => b.phase === "finished").length}
              icon={ArrowLeftRight}
            />
            <KpiCard
              label="Esforço Total"
              value={`${backlogs.reduce((acc, b) => acc + (b.refinement?.estimate || 0), 0)}h`}
              icon={Clock}
            />
            <KpiCard label="Lead Time" value="12 dias" icon={Timer} />
          </div>
        </TabsContent>

        {/* --- ABA 2: USUÁRIOS (CRIADOS E ETAPAS ESPECÍFICAS) --- */}
        <TabsContent value="tatico" className="space-y-6">
          <div className="neu-card p-6 rounded-3xl overflow-hidden">
            <h3 className="text-sm font-bold uppercase mb-6 flex items-center gap-2 text-primary tracking-tighter">
              <UserCheck className="w-4 h-4" /> Performance por Usuário
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] font-black uppercase text-muted-foreground">
                    <th className="py-3">Colaborador</th>
                    <th className="py-3 text-center">Criados</th>
                    <th className="py-3 text-center text-sky-500">Aprovados</th>
                    <th className="py-3 text-center text-indigo-500">Ref. Func</th>
                    <th className="py-3 text-center text-primary">Ref. Técn</th>
                    <th className="py-3 text-center text-emerald-500">Priorizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(stats.users).map(([name, data]: any) => (
                    <tr key={name} className="hover:bg-foreground/[0.02] transition-colors text-xs">
                      <td className="py-4 font-bold uppercase">{name}</td>
                      <td className="py-4 text-center font-black">{data.created}</td>
                      <td className="py-4 text-center font-bold text-sky-500">{data.approved}</td>
                      <td className="py-4 text-center font-bold text-indigo-500">{data.refFunc}</td>
                      <td className="py-4 text-center font-bold text-primary">{data.refTech}</td>
                      <td className="py-4 text-center font-bold text-emerald-500">{data.prioritized}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 3: SEGMENTAÇÃO (GRÁFICOS POR STATUS: PRODUTO, CLIENTE E PRIORIDADE) --- */}
        <TabsContent value="segmentation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos */}
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase mb-6 text-primary flex justify-between items-center">
                <span>Status por Produto</span>
                <span className="text-[10px] text-muted-foreground">Finalizados vs Total</span>
              </h3>
              <div className="space-y-6">
                {Object.entries(stats.products).map(([name, data]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>
                        {name} ({data.total})
                      </span>
                      <span className="text-primary">{data.hours}h Estimadas</span>
                    </div>
                    <div className="flex h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div style={{ width: `${(data.finished / data.total) * 100}%` }} className="bg-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clientes */}
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase mb-6 text-sky-500">Status por Cliente</h3>
              <div className="space-y-6">
                {Object.entries(stats.clients).map(([name, data]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>
                        {name} ({data.total})
                      </span>
                      <span>{data.hours}h de Esforço</span>
                    </div>
                    <div className="flex h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div style={{ width: `${(data.finished / data.total) * 100}%` }} className="bg-sky-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prioridades */}
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase mb-6 text-orange-500">Status por Prioridade</h3>
              <div className="space-y-6">
                {Object.entries(stats.priorities).map(([name, data]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>
                        {name} ({data.total})
                      </span>
                    </div>
                    <div className="flex h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div style={{ width: `${(data.finished / data.total) * 100}%` }} className="bg-orange-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complexidade (Gráfico de Distribuição) */}
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase mb-6">Volume por Complexidade</h3>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(stats.complexities).map(([level, val]: any) => (
                  <div key={level} className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase w-16">{level}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(val / (backlogs.length || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 4: OPERACIONAL (ÁREA E CARGA) --- */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Prontos p/ Sprint"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard
              label="Aguardando Ref. Técn"
              value={backlogs.filter((b) => b.phase === "functional_refinement").length}
              icon={Code2}
            />
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase mb-6">Backlogs por Área de Atuação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.areas).map(([area, val]: any) => (
                <div key={area} className="p-4 bg-secondary/20 rounded-2xl text-center">
                  <p className="text-2xl font-black">{val}</p>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">{area}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
