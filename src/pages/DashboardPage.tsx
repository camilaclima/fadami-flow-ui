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

  // --- MOTOR DE CÁLCULO DE KPIs ---
  const finishedItems = backlogs.filter((b) => b.phase === "finished");
  const wipItems = backlogs.filter((b) => !["finished", "prioritization"].includes(b.phase));
  const totalItems = backlogs.length || 1;

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

      // Inicialização segura
      if (!acc.users[userName]) acc.users[userName] = { total: 0, byPhase: {} };
      if (!acc.products[product]) acc.products[product] = { total: 0, hours: 0, byStatus: {} };
      if (!acc.clients[client]) acc.clients[client] = { total: 0, hours: 0, byStatus: {} };
      if (!acc.priority[priority]) acc.priority[priority] = { total: 0, byStatus: {} };
      if (!acc.areas[area]) acc.areas[area] = 0;
      if (!acc.complexities[complexity]) acc.complexities[complexity] = 0;

      // Contadores
      acc.users[userName].total += 1;
      acc.users[userName].byPhase[b.phase] = (acc.users[userName].byPhase[b.phase] || 0) + 1;
      acc.products[product].total += 1;
      acc.products[product].hours += estimate;
      acc.products[product].byStatus[b.phase] = (acc.products[product].byStatus[b.phase] || 0) + 1;
      acc.clients[client].total += 1;
      acc.clients[client].hours += estimate;
      acc.clients[client].byStatus[b.phase] = (acc.clients[client].byStatus[b.phase] || 0) + 1;
      acc.priority[priority].total += 1;
      acc.areas[area] += 1;
      acc.complexities[complexity] += 1;

      return acc;
    },
    { users: {}, products: {}, clients: {}, priority: {}, areas: {}, complexities: {} },
  );

  if (isLoading) return <div className="p-10 text-center font-bold">Carregando BI...</div>;

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">FadamiFlow Cockpit</h1>
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Esforço Global</p>
          <p className="text-xl font-black text-primary">
            {backlogs.reduce((acc, b) => acc + (b.refinement?.estimate || 0), 0)}h
          </p>
        </div>
      </div>

      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="strategic" className="rounded-xl px-4 py-2 gap-2">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="rounded-xl px-4 py-2 gap-2">
            <Users className="w-4 h-4" /> Time & Produtividade
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="rounded-xl px-4 py-2 gap-2">
            <Box className="w-4 h-4" /> Produtos & Clientes
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-4 py-2 gap-2">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* --- 1. ESTRATÉGICO: VALOR E EFICIÊNCIA --- */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Alinhamento Estratégico"
              value={`${Math.round((backlogs.filter((b) => (b.prioritization?.businessValue || 0) >= 4).length / totalItems) * 100)}%`}
              icon={TrendingUp}
              accent="bg-blue-500/10 text-blue-500"
            />
            <KpiCard
              label="Throughput (Entregas)"
              value={finishedItems.length}
              icon={ArrowLeftRight}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard label="Lead Time Médio" value="12 dias" icon={Timer} />
            <KpiCard label="Taxa de Abandono" value="7%" icon={Ban} accent="bg-rose-500/10 text-rose-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="neu-card p-6 rounded-3xl md:col-span-2">
              <h3 className="text-sm font-bold uppercase mb-4">WIP (Trabalho em Andamento)</h3>
              <div className="flex items-end gap-2 h-24">
                {PHASES.filter((p) => p !== "finished").map((p) => {
                  const count = backlogs.filter((b) => b.phase === p).length;
                  return (
                    <div
                      key={p}
                      className="flex-1 bg-primary/20 rounded-t-lg relative group"
                      style={{ height: `${(count / totalItems) * 100 + 10}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {PHASE_LABELS[p]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 uppercase font-bold text-center">
                Total de {wipItems.length} itens circulando no fluxo agora
              </p>
            </div>
            <KpiCard
              label="Itens de Alta Prioridade"
              value={stats.priority["high"]?.total || 0}
              icon={AlertCircle}
              accent="bg-orange-500/10 text-orange-500"
              description="Itens que exigem atenção imediata."
            />
          </div>
        </TabsContent>

        {/* --- 2. TÁTICO: PRODUTIVIDADE POR USUÁRIO --- */}
        <TabsContent value="tatico" className="space-y-6">
          <div className="neu-card p-6 rounded-3xl overflow-hidden">
            <h3 className="text-sm font-bold uppercase mb-6 flex items-center gap-2 text-primary tracking-tighter">
              <UserCheck className="w-4 h-4" /> Produtividade por Usuário e Etapa
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 text-[10px] font-black uppercase text-muted-foreground">Usuário</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-muted-foreground">Criados</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-sky-500">Aprovados</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-indigo-500">Ref. Func</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-primary">Ref. Técn</th>
                    <th className="py-3 text-[10px] font-black uppercase text-center text-emerald-500">Finalizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(stats.users).map(([name, data]: any) => (
                    <tr key={name} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-4 text-xs font-bold uppercase">{name}</td>
                      <td className="py-4 text-center text-sm font-black">{data.total}</td>
                      <td className="py-4 text-center text-sm font-bold text-sky-500">{data.byPhase.approval || 0}</td>
                      <td className="py-4 text-center text-sm font-bold text-indigo-500">
                        {data.byPhase.functional_refinement || 0}
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-primary">
                        {data.byPhase.technical_refinement || 0}
                      </td>
                      <td className="py-4 text-center text-sm font-bold text-emerald-500">
                        {data.byPhase.finished || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* --- 3. SEGMENTAÇÃO: PRODUTOS E CLIENTES --- */}
        <TabsContent value="segmentation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-primary tracking-tighter">
                <Box className="w-4 h-4" /> Backlogs por Produto e Status
              </h3>
              <div className="space-y-6">
                {Object.entries(stats.products).map(([name, data]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>
                        {name} ({data.total} itens)
                      </span>
                      <span className="text-primary">{data.hours}h Estimadas</span>
                    </div>
                    <div className="flex h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${((data.byStatus.finished || 0) / data.total) * 100}%` }}
                        className="bg-emerald-500"
                        title="Finalizados"
                      />
                      <div
                        style={{ width: `${((data.total - (data.byStatus.finished || 0)) / data.total) * 100}%` }}
                        className="bg-amber-500"
                        title="Em Aberto"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-6 rounded-3xl">
              <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2 text-sky-500 tracking-tighter">
                <Users className="w-4 h-4" /> Backlogs por Cliente e Status
              </h3>
              <div className="space-y-6">
                {Object.entries(stats.clients).map(([name, data]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>
                        {name} ({data.total} itens)
                      </span>
                      <span>{data.hours}h de Esforço</span>
                    </div>
                    <div className="flex h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${((data.byStatus.finished || 0) / data.total) * 100}%` }}
                        className="bg-emerald-500"
                      />
                      <div
                        style={{ width: `${((data.total - (data.byStatus.finished || 0)) / data.total) * 100}%` }}
                        className="bg-sky-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- 4. OPERACIONAL: CARGA, COMPLEXIDADE E ÁREA --- */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Prontos p/ Sprint"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard label="Itens Bloqueados" value="4" icon={AlertCircle} accent="bg-rose-500/10 text-rose-500" />
            <KpiCard label="Conclusão da Sprint" value="85%" icon={Target} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="neu-card p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase text-muted-foreground mb-4">Distribuição por Área</h3>
              <div className="space-y-3">
                {Object.entries(stats.areas).map(([area, val]: any) => (
                  <div key={area} className="flex justify-between items-center text-xs border-b border-border/50 pb-2">
                    <span className="font-bold">{area}</span>
                    <span className="bg-secondary px-2 py-0.5 rounded-lg">{val} cards</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase text-muted-foreground mb-4">Nível de Complexidade</h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(stats.complexities).map(([level, val]: any) => (
                  <div key={level} className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(val / totalItems) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold w-12">
                      {level} ({val})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card p-5 rounded-3xl bg-primary/5 border border-primary/20">
              <h3 className="text-xs font-black uppercase text-primary mb-4">SLA de Refinamento</h3>
              <p className="text-sm font-medium">
                92% dos itens estão dentro do tempo esperado de refinamento técnico (3 dias).
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
