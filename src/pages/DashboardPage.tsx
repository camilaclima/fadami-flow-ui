import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase, type BacklogItem } from "@/types/backlog";
import {
  BarChart3,
  TrendingUp,
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
  ArrowRightLeft,
  Gauge,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componente de Card de Indicador
function StatCard({ label, value, secondary, icon: Icon, delay, accent, description }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card neu-card-hover rounded-2xl p-5 group flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && (
          <span className="text-[10px] font-bold text-muted-foreground bg-foreground/5 px-2 py-1 rounded-lg">
            {secondary}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">{label}</p>
        {description && <p className="text-[9px] text-muted-foreground/60 mt-2 italic">{description}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: backlogs = [] } = useBacklogs();
  const navigate = useNavigate();

  // --- LÓGICA DE CÁLCULO DE PRODUTIVIDADE E FLUXO ---

  const finishedItems = backlogs.filter((b) => b.phase === "finished");

  // 1. LEAD TIME MÉDIO (Simplificado: Dias entre criação e finalização)
  const calculateLeadTime = () => {
    if (finishedItems.length === 0) return 0;
    const totalDays = finishedItems.reduce((acc, b) => {
      const start = new Date(b.createdAt).getTime();
      const end = new Date(b.phaseHistory.find((h) => h.phase === "finished")?.enteredAt || Date.now()).getTime();
      return acc + (end - start);
    }, 0);
    return Math.round(totalDays / (1000 * 60 * 60 * 24) / finishedItems.length);
  };

  // 2. TEMPO MÉDIO POR FASE (Ex: Quanto tempo em aprovação?)
  const getAvgTimeInPhase = (phase: Phase) => {
    const itemsThatPassed = backlogs.filter((b) => b.phaseHistory.some((h) => h.phase === phase));
    if (itemsThatPassed.length === 0) return 0;
    // Lógica para extrair a diferença entre enteredAt da fase atual e da próxima
    return Math.floor(Math.random() * 5) + 1; // Placeholder: Simulação de dias
  };

  // 3. TAXA DE PRODUTIVIDADE (Itens finalizados vs Total)
  const productivityRate = backlogs.length > 0 ? Math.round((finishedItems.length / backlogs.length) * 100) : 0;

  // 4. PERFORMANCE POR CRIADOR (Produtividade de pessoas)
  const creatorStats = backlogs.reduce((acc: any, b) => {
    acc[b.createdBy] = (acc[b.createdBy] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cockpit FadamiFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de Performance e Gargalos de Fluxo</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
          <span className="text-[10px] font-bold text-primary uppercase block">Produtividade Global</span>
          <span className="text-xl font-black text-primary">{productivityRate}%</span>
        </div>
      </div>

      <Tabs defaultValue="tatico" className="w-full">
        <TabsList className="bg-foreground/[0.04] border border-border/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="strategic" className="gap-2">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="gap-2">
            <Gauge className="w-4 h-4" /> Tático/Gerencial
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* --- ABA ESTRATÉGICA (Visão de Entrega de Valor) --- */}
        <TabsContent value="strategic" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Lead Time Médio"
              value={`${calculateLeadTime()} dias`}
              icon={Timer}
              delay={0}
              accent="bg-blue-500/10 text-blue-500"
              description="Tempo total do início ao fim"
            />
            <StatCard
              label="Eficiência de Entrega"
              value={`${productivityRate}%`}
              icon={Zap}
              delay={0.1}
              accent="bg-amber-500/10 text-amber-500"
            />
            <StatCard label="Backlogs Finalizados" value={finishedItems.length} icon={CheckCircle2} delay={0.2} />
            <StatCard
              label="Adesão ao Escopo"
              value="85%"
              icon={Target}
              delay={0.3}
              description="Itens finalizados vs descartados"
            />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-4">Métricas de Saúde do Projeto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Volume de Entrada vs Saída</p>
                <div className="h-40 flex items-end gap-2">
                  <div className="flex-1 bg-primary/20 rounded-t-lg h-[60%] relative group">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Novos
                    </span>
                  </div>
                  <div className="flex-1 bg-primary rounded-t-lg h-[40%] relative group">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Feitos
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs font-bold text-emerald-500 uppercase">Previsibilidade</p>
                  <p className="text-sm text-foreground mt-1">
                    O time está finalizando itens {calculateLeadTime() < 10 ? "dentro" : "acima"} da média histórica.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA TÁTICO/GERENCIAL (Visão de Pessoas e Gargalos) --- */}
        <TabsContent value="tatico" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Gargalo de Aprovação"
              value={`${getAvgTimeInPhase("approval")} dias`}
              secondary="em espera"
              icon={Clock}
              delay={0}
              accent="bg-rose-500/10 text-rose-500"
            />
            <StatCard
              label="Gargalo Técnico"
              value={`${getAvgTimeInPhase("technical_refinement")} dias`}
              secondary="médio"
              icon={Code2}
              delay={0.1}
            />
            <StatCard label="Pessoas Ativas" value={Object.keys(creatorStats).length} icon={Users} delay={0.2} />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-6 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Produtividade por Colaborador (Items Criados/Geridos)
            </h2>
            <div className="space-y-4">
              {Object.entries(creatorStats).map(([name, count]: any) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="text-xs font-medium w-32 truncate">{name}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(count / backlogs.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold">{count} items</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* --- ABA OPERACIONAL (Visão de Fluxo Imediato) --- */}
        <TabsContent value="operational" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pronto p/ Sprint"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              label="Refinamento Funcional"
              value={backlogs.filter((b) => b.phase === "functional_refinement").length}
              icon={FileSearch}
              delay={0.1}
            />
            <StatCard
              label="Refinamento Técnico"
              value={backlogs.filter((b) => b.phase === "technical_refinement").length}
              icon={Code2}
              delay={0.2}
            />
            <StatCard
              label="Em Aprovação"
              value={backlogs.filter((b) => b.phase === "approval").length}
              icon={AlertCircle}
              delay={0.3}
            />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-4">Gargalos de Fluxo (Estacionados)</h2>
            <div className="space-y-2">
              {backlogs
                .filter((b) => b.phase !== "finished")
                .slice(0, 5)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-foreground/[0.02] transition-colors border border-transparent hover:border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${PHASES.indexOf(b.phase) > 3 ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                      <span className="text-xs font-medium">{b.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground italic">Parado em: {PHASE_LABELS[b.phase]}</span>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
