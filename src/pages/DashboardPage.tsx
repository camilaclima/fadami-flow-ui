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
  const { data: rawBacklogs = [] } = useBacklogs();
  const backlogs = rawBacklogs as any[];
  const navigate = useNavigate();

  // --- CÁLCULOS GERAIS ---
  const finished = backlogs.filter((b) => b.phase === "finished");
  const totalItems = backlogs.length || 1;
  const strategicItems = backlogs.filter((b) => (b.prioritization?.businessValue || 0) >= 4);

  // --- LÓGICA DE USUÁRIOS (TÁTICO) ---
  // --- LÓGICA DE USUÁRIOS (TÁTICO) ---
  const userStats = backlogs.reduce((acc: any, b) => {
    // Tenta pegar o nome mapeado (createdBy), se não existir, usa o ID bruto (created_by)
    // No nosso store, 'createdBy' já vem com o Nome + Sobrenome do profile
    const user = b.createdBy || b.created_by || "Sistema";

    if (!acc[user]) acc[user] = { total: 0, finished: 0, phases: {}, highValue: 0 };

    acc[user].total += 1;
    if (b.phase === "finished") acc[user].finished += 1;
    if ((b.prioritization?.businessValue || 0) >= 4) acc[user].highValue += 1;

    const phaseLabel = PHASE_LABELS[b.phase as Phase] || b.phase;
    acc[user].phases[phaseLabel] = (acc[user].phases[phaseLabel] || 0) + 1;

    return acc;
  }, {});

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">ProdOps Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise Integrada de Valor, Pessoas e Execução</p>
        </div>
      </div>

      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="strategic" className="rounded-xl px-5 py-2 gap-2 data-[state=active]:bg-card">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="rounded-xl px-5 py-2 gap-2 data-[state=active]:bg-card">
            <Gauge className="w-4 h-4" /> Tático/Gerencial
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-5 py-2 gap-2 data-[state=active]:bg-card">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* --- ABA 1: ESTRATÉGICO (FOCO EM VALOR E NEGÓCIO) --- */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Alinhamento Estratégico"
              value={`${Math.round((strategicItems.length / totalItems) * 100)}%`}
              icon={TrendingUp}
              delay={0}
              accent="bg-blue-500/10 text-blue-500"
              description="Itens com alto Business Value"
            />
            <KpiCard
              label="Valor Entregue"
              value={finished.reduce((acc, b) => acc + (b.prioritization?.businessValue || 0), 0)}
              secondary="pts"
              icon={Zap}
              delay={0.1}
              accent="bg-amber-500/10 text-amber-500"
              description="Soma de pontos de valor finalizados"
            />
            <KpiCard
              label="Lead Time Médio"
              value="12 dias"
              icon={Timer}
              delay={0.2}
              description="Tempo de 'Ideia para Entrega'"
            />
            <KpiCard
              label="Taxa de Abandono"
              value="8%"
              icon={Ban}
              delay={0.3}
              accent="bg-rose-500/10 text-rose-500"
              description="Itens descartados ou cancelados"
            />
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase mb-4 tracking-tighter">Mix de Carga de Trabalho</h3>
            <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
              <div style={{ width: "55%" }} className="bg-primary" title="Novas Funcionalidades" />
              <div style={{ width: "25%" }} className="bg-sky-400" title="Melhorias" />
              <div style={{ width: "20%" }} className="bg-rose-400" title="Dívida Técnica" />
            </div>
            <div className="flex flex-wrap gap-4 mt-6 justify-center text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" /> Funcionalidades
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-sky-400" /> Melhorias
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-400" /> Dívida Técnica
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 2: TÁTICO (FOCO EM PESSOAS E GARGALOS) --- */}
        <TabsContent value="tatico" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Throughput"
              value={finished.length}
              secondary="items"
              icon={ArrowLeftRight}
              delay={0}
              description="Itens finalizados no período"
            />
            <KpiCard
              label="WIP (Work in Progress)"
              value={backlogs.filter((b) => !["finished", "prioritization"].includes(b.phase)).length}
              icon={Microscope}
              delay={0.1}
              accent="bg-indigo-500/10 text-indigo-500"
            />
            <KpiCard
              label="Taxa de Retrabalho"
              value="14%"
              icon={Recycle}
              delay={0.2}
              accent="bg-orange-500/10 text-orange-500"
              description="Itens que voltaram de etapa"
            />
            <KpiCard
              label="Acurácia de Est."
              value="82%"
              icon={BarChart3}
              delay={0.3}
              description="Estimado vs Realizado"
            />
          </div>

          <div className="neu-card p-6 rounded-3xl overflow-hidden">
            <h3 className="text-sm font-bold uppercase mb-8 flex items-center gap-2 tracking-tighter">
              <Users className="w-4 h-4 text-primary" /> Produtividade e Perfil por Colaborador
            </h3>
            <div className="space-y-8">
              {Object.entries(userStats).map(([name, stats]: any) => {
                const mainPhase = Object.entries(stats.phases).reduce((a: any, b: any) => (a[1] > b[1] ? a : b))[0];
                const productivity = Math.round((stats.finished / stats.total) * 100);
                return (
                  <div key={name} className="border-b border-border/40 pb-6 last:border-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="md:w-1/4">
                        <p className="text-sm font-black text-foreground uppercase truncate">{name}</p>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-primary/10 text-primary mt-1 inline-block">
                          Especialidade: {mainPhase}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                          <span>
                            Conclusão ({stats.finished}/{stats.total})
                          </span>
                          <span>{productivity}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${productivity}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-8 md:ml-12">
                        <div className="text-center">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Estratégicos</p>
                          <p className="text-lg font-black">{stats.highValue}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 3: OPERACIONAL (FOCO EM EXECUÇÃO E PRONTIDÃO) --- */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Prontos p/ Sprint"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard
              label="Itens Bloqueados"
              value="4"
              icon={AlertCircle}
              delay={0.1}
              accent="bg-rose-500/10 text-rose-500"
            />
            <KpiCard label="Média Horas Subitem" value="4.5h" icon={Clock} delay={0.2} />
            <KpiCard
              label="Alta Prioridade"
              value={backlogs.filter((b) => b.prioritization?.priority === "high").length}
              icon={BarChart3}
              delay={0.3}
            />
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase mb-4 tracking-tighter">Fluxo de Refinamento (Aging)</h3>
            <div className="divide-y divide-border">
              {backlogs
                .filter((b) => b.phase !== "finished")
                .slice(0, 5)
                .map((b) => (
                  <div
                    key={b.id}
                    className="py-4 flex items-center justify-between hover:bg-foreground/[0.02] cursor-pointer rounded-xl px-2 transition-all"
                    onClick={() => navigate("/backlogs")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{b.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
                          Há 5 dias em: {PHASE_LABELS[b.phase as Phase] || b.phase}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
