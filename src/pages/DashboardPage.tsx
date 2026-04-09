import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase, type BacklogItem } from "@/types/backlog";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  FileSearch,
  Code2,
  AlertCircle,
  DollarSign,
  Zap,
  target,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Reutilizando o StatCard com suporte a cores dinâmicas
function StatCard({ label, value, secondary, icon: Icon, delay, accent }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card neu-card-hover rounded-2xl p-5 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: backlogs = [] } = useBacklogs();
  const navigate = useNavigate();

  // --- LÓGICA DE CÁLCULO PARA DIRETORIA ---

  // ESTRATÉGICOS
  const totalBusinessValue = backlogs.reduce((acc, b) => acc + (b.prioritization?.businessValue ?? 0), 0);
  const deliveredValue = backlogs
    .filter((b) => b.phase === "finished")
    .reduce((acc, b) => acc + (b.prioritization?.businessValue ?? 0), 0);
  const roiIndex = totalBusinessValue > 0 ? ((deliveredValue / totalBusinessValue) * 100).toFixed(1) : 0;

  const opportunityCostWaiting = backlogs
    .filter((b) => b.phase !== "finished")
    .reduce((acc, b) => acc + (b.prioritization?.opportunityCost ?? 0), 0);

  // OPERACIONAIS
  const readyToBuild = backlogs.filter((b) => b.phase === "available").length;
  const inRefinement = backlogs.filter(
    (b) => b.phase === "functional_refinement" || b.phase === "technical_refinement",
  ).length;
  const functionalGargalo = backlogs.filter((b) => b.phase === "approval").length;

  // ESFORÇO & CUSTOS
  const totalHours = backlogs.reduce((acc, b) => acc + (b.refinement?.estimate ?? 0), 0);
  const hourValue = 150; // Valor hipotético da hora técnica para a diretoria
  const totalEstimatedCost = (totalHours * hourValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cockpit FadamiFlow</h1>
        <p className="text-sm text-muted-foreground mt-1">Inteligência de Backlog e Performance</p>
      </div>

      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="bg-foreground/[0.04] border border-border/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="strategic" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
          <TabsTrigger value="effort" className="gap-2">
            <DollarSign className="w-4 h-4" /> Esforço & Custos
          </TabsTrigger>
        </TabsList>

        {/* --- ABA ESTRATÉGICA --- */}
        <TabsContent value="strategic" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="ROI do Produto"
              value={`${roiIndex}%`}
              secondary="entregue"
              icon={Zap}
              delay={0}
              accent="bg-amber-500/10 text-amber-500"
            />
            <StatCard label="Valor de Negócio Total" value={totalBusinessValue} icon={BarChart3} delay={0.1} />
            <StatCard
              label="Custo de Oportunidade"
              value={opportunityCostWaiting}
              secondary="em espera"
              icon={AlertCircle}
              delay={0.2}
              accent="bg-rose-500/10 text-rose-500"
            />
            <StatCard
              label="Itens Estratégicos"
              value={backlogs.filter((b) => (b.prioritization?.businessValue ?? 0) >= 4).length}
              icon={CheckCircle2}
              delay={0.3}
            />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-4">Visão de Valor vs. Entrega</h2>
            <div className="h-4 w-full bg-secondary rounded-full overflow-hidden flex">
              <div style={{ width: `${roiIndex}%` }} className="h-full bg-primary" title="Entregue" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-right">
              A meta é atingir 100% do Business Value mapeado.
            </p>
          </div>
        </TabsContent>

        {/* --- ABA OPERACIONAL --- */}
        <TabsContent value="operational" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pronto para Sprint"
              value={readyToBuild}
              secondary="cards"
              icon={CheckCircle2}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              label="Em Refinamento"
              value={inRefinement}
              icon={Code2}
              delay={0.1}
              accent="bg-indigo-500/10 text-indigo-500"
            />
            <StatCard
              label="Aguardando Aprovação"
              value={functionalGargalo}
              icon={FileSearch}
              delay={0.2}
              accent="bg-sky-500/10 text-sky-500"
            />
            <StatCard
              label="Total em Andamento"
              value={backlogs.filter((b) => b.phase !== "finished").length}
              icon={Activity}
              delay={0.3}
            />
          </div>
          {/* Gráfico de Barras por fase pode ser inserido aqui como no anterior */}
        </TabsContent>

        {/* --- ABA DE ESFORÇO --- */}
        <TabsContent value="effort" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Investimento Estimado"
              value={totalEstimatedCost}
              icon={DollarSign}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard label="Esforço Técnico Total" value={`${totalHours}h`} icon={Clock} delay={0.1} />
            <StatCard label="Complexidade Média" value="Média" icon={Zap} delay={0.2} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="neu-card p-5 rounded-2xl border-l-4 border-amber-500">
              <h3 className="text-xs font-bold text-muted-foreground uppercase">Risco de Prazo</h3>
              <p className="text-sm mt-1 text-foreground">
                Existem {backlogs.filter((b) => b.thermometer === "high").length} itens classificados com termômetro
                alto que requerem atenção da diretoria.
              </p>
            </div>
            <div className="neu-card p-5 rounded-2xl border-l-4 border-indigo-500">
              <h3 className="text-xs font-bold text-muted-foreground uppercase">Alocação de Time</h3>
              <p className="text-sm mt-1 text-foreground">
                O foco atual do backlog está em 70% Funcional e 30% Técnico.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
