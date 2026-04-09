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
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function KpiCard({ label, value, secondary, icon: Icon, delay, accent, description }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card rounded-2xl p-5 border-l-4 border-l-transparent hover:border-l-primary transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && <span className="text-[10px] font-bold text-primary">{secondary}</span>}
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{label}</p>
      {description && <p className="text-[9px] text-muted-foreground/50 mt-2 leading-none">{description}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: rawBacklogs = [] } = useBacklogs();
  const backlogs = rawBacklogs as any[];
  const navigate = useNavigate();

  // --- CÁLCULOS DE PRODUTIVIDADE E PERFIL DE USUÁRIO ---

  const userStats = backlogs.reduce((acc: any, b) => {
    const user = b.created_by || b.createdBy || "Sistema";
    if (!acc[user]) {
      acc[user] = {
        total: 0,
        finished: 0,
        phases: {},
        highValue: 0,
      };
    }

    acc[user].total += 1;
    if (b.phase === "finished") acc[user].finished += 1;
    if ((b.prioritization?.businessValue || 0) >= 4) acc[user].highValue += 1;

    // Mapeia onde o usuário mais atua (baseado na fase atual dos cards que ele criou/gere)
    const phaseLabel = PHASE_LABELS[b.phase as Phase] || b.phase;
    acc[user].phases[phaseLabel] = (acc[user].phases[phaseLabel] || 0) + 1;

    return acc;
  }, {});

  const finished = backlogs.filter((b) => b.phase === "finished");
  const throughput = finished.length;
  const wip = backlogs.filter((b) => !["finished", "prioritization"].includes(b.phase)).length;

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">ProdOps Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Inteligência de Fluxo e Performance de Time</p>
        </div>
      </div>

      <Tabs defaultValue="tatico" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8 flex flex-wrap h-auto">
          <TabsTrigger value="strategic" className="rounded-xl px-5 py-2 gap-2">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="rounded-xl px-5 py-2 gap-2">
            <Gauge className="w-4 h-4" /> Tático/Gerencial
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-5 py-2 gap-2">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* --- ABA 2: TÁTICO (Onde incluímos os Usuários) --- */}
        <TabsContent value="tatico" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Throughput Total" value={throughput} icon={ArrowLeftRight} delay={0} />
            <KpiCard label="WIP (Em Fluxo)" value={wip} icon={Microscope} delay={0.1} />
            <KpiCard label="Colaboradores Ativos" value={Object.keys(userStats).length} icon={Users} delay={0.2} />
            <KpiCard
              label="Taxa de Entrega"
              value={`${Math.round((throughput / (backlogs.length || 1)) * 100)}%`}
              icon={UserCheck}
              delay={0.3}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="neu-card p-6 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Produtividade e Especialidade por Usuário
                </h3>
                <span className="text-[10px] text-muted-foreground italic">Baseado nos últimos backlogs</span>
              </div>

              <div className="space-y-8">
                {Object.entries(userStats).map(([name, stats]: any) => {
                  // Descobre a etapa predominante
                  const mainPhase = Object.entries(stats.phases).reduce((a: any, b: any) => (a[1] > b[1] ? a : b))[0];
                  const productivity = Math.round((stats.finished / stats.total) * 100);

                  return (
                    <div key={name} className="group relative border-b border-border/40 pb-6 last:border-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="w-full md:w-1/4">
                          <p className="text-sm font-black text-foreground uppercase">{name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-primary/10 text-primary`}
                            >
                              Foco: {mainPhase}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                            <span>
                              Taxa de Conclusão ({stats.finished}/{stats.total})
                            </span>
                            <span>{productivity}%</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${productivity}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>

                        <div className="flex gap-8 md:ml-12 text-right">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Itens Estra.</p>
                            <p className="text-lg font-black">{stats.highValue}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Cards</p>
                            <p className="text-lg font-black">{stats.total}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Manter as abas Strategic e Operational conforme o código anterior */}
        <TabsContent value="strategic" className="space-y-4">
          {/* ... Conteúdo Strategic anterior ... */}
        </TabsContent>
        <TabsContent value="operational" className="space-y-4">
          {/* ... Conteúdo Operational anterior ... */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
