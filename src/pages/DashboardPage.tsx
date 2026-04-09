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
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Card de Indicador com Tooltip/Descrição
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

  // --- CÁLCULOS INTELIGENTES (KPIs) ---

  const finished = backlogs.filter((b) => b.phase === "finished");

  // 1. ESTRATÉGICOS
  const strategicAlignment = Math.round(
    (backlogs.filter((b) => b.prioritization?.businessValue >= 4).length / (backlogs.length || 1)) * 100,
  );
  const deliveredValue = finished.reduce((acc, b) => acc + (b.prioritization?.businessValue || 0), 0);
  const abandonedRate = Math.round(
    (backlogs.filter((b) => b.status === "discarded").length / (backlogs.length || 1)) * 100,
  );

  // 2. TÁTICOS
  const throughput = finished.length; // Total entregue no período
  const wip = backlogs.filter((b) => !["finished", "prioritization"].includes(b.phase)).length;

  // 3. OPERACIONAIS
  const readyToSprint = backlogs.filter((b) => b.phase === "available").length;
  const readyRate = Math.round((readyToSprint / (backlogs.filter((b) => b.phase !== "finished").length || 1)) * 100);
  const highPriorityItems = backlogs.filter((b) => b.prioritization?.priority === "high").length;

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">ProdOps Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de Fluxo, Eficiência e Valor</p>
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

        {/* --- ABA 1: ESTRATÉGICO --- */}
        <TabsContent value="strategic" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Alinhamento Estratégico"
              value={`${strategicAlignment}%`}
              icon={Target}
              delay={0}
              accent="bg-blue-500/10 text-blue-500"
              description="Itens de alto valor de negócio."
            />
            <KpiCard
              label="Valor Total Entregue"
              value={deliveredValue}
              secondary="pts"
              icon={Zap}
              delay={0.1}
              accent="bg-amber-500/10 text-amber-500"
              description="Soma de valor dos itens finalizados."
            />
            <KpiCard
              label="Lead Time Médio"
              value="12 dias"
              icon={Timer}
              delay={0.2}
              description="Média de criação até entrega."
            />
            <KpiCard
              label="Taxa de Abandono"
              value={`${abandonedRate}%`}
              icon={Ban}
              delay={0.3}
              accent="bg-rose-500/10 text-rose-500"
            />
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold mb-4">Distribuição de Demanda</h3>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div style={{ width: "40%" }} className="bg-primary" title="Inovação" />
              <div style={{ width: "30%" }} className="bg-sky-400" title="Melhoria" />
              <div style={{ width: "20%" }} className="bg-amber-400" title="Bug" />
              <div style={{ width: "10%" }} className="bg-rose-400" title="Técnico" />
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <div className="w-2 h-2 rounded-full bg-primary" /> Inovação
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <div className="w-2 h-2 rounded-full bg-sky-400" /> Melhoria
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <div className="w-2 h-2 rounded-full bg-amber-400" /> Bug
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <div className="w-2 h-2 rounded-full bg-rose-400" /> Técnico
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 2: TÁTICO --- */}
        <TabsContent value="tatico" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Throughput"
              value={throughput}
              secondary="itens"
              icon={ArrowRightLeft}
              delay={0}
              description="Itens finalizados no período."
            />
            <KpiCard
              label="WIP Atual"
              value={wip}
              icon={Microscope}
              delay={0.1}
              accent="bg-indigo-500/10 text-indigo-500"
              description="Trabalho em andamento."
            />
            <KpiCard
              label="Taxa de Retrabalho"
              value="12%"
              icon={Recycle}
              delay={0.2}
              accent="bg-orange-500/10 text-orange-500"
            />
            <KpiCard
              label="SLA de Refinamento"
              value="92%"
              icon={CheckCircle2}
              delay={0.3}
              accent="bg-emerald-500/10 text-emerald-500"
            />
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h3 className="text-sm font-bold mb-6">Tempo Médio por Etapa (Gargalos)</h3>
            <div className="space-y-4">
              {["Aprovação", "Ref. Funcional", "Ref. Técnico"].map((label, i) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold w-24 uppercase">{label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${[30, 80, 50][i]}%` }} />
                  </div>
                  <span className="text-xs font-bold text-primary">{[2, 5, 3][i]} dias</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* --- ABA 3: OPERACIONAL --- */}
        <TabsContent value="operational" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Prontos p/ Sprint"
              value={readyToSprint}
              secondary={`${readyRate}%`}
              icon={CheckCircle2}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard
              label="Itens Bloqueados"
              value="3"
              icon={AlertCircle}
              delay={0.1}
              accent="bg-rose-500/10 text-rose-500"
            />
            <KpiCard label="Alta Prioridade" value={highPriorityItems} icon={BarChart3} delay={0.2} />
            <KpiCard label="Conclusão de Sprint" value="88%" icon={Target} delay={0.3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="neu-card p-5 rounded-2xl">
              <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-4">Saúde do Backlog</h3>
              <p className="text-sm">
                Existem <strong>{readyToSprint}</strong> itens prontos para desenvolvimento, o que representa{" "}
                <strong>{readyRate}%</strong> da capacidade necessária para a próxima sprint.
              </p>
            </div>
            <div className="neu-card p-5 rounded-2xl">
              <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-4">Alerta de Prioridade</h3>
              <p className="text-sm">
                <strong>{highPriorityItems}</strong> itens são de alta prioridade.{" "}
                {highPriorityItems > 5 ? "Atenção: Sobrecarga de urgências." : "Carga de prioridade saudável."}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
