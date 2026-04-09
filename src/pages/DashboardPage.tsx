import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import { BarChart3, TrendingUp, CheckCircle2, ArrowUpRight, Clock, FileSearch, Code2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function StatCard({
  label,
  value,
  secondary,
  icon: Icon,
  delay,
  accent,
}: {
  label: string;
  value: string | number;
  secondary?: string;
  icon: React.ElementType;
  delay: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card neu-card-hover rounded-2xl p-5 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${accent ? "text-foreground" : "text-primary"}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{label}</p>
    </motion.div>
  );
}

const PHASE_DOT: Record<Phase, string> = {
  prioritization: "bg-phase-prioritization",
  approval: "bg-phase-approval",
  functional_refinement: "bg-phase-functional-refinement",
  technical_refinement: "bg-phase-technical-refinement",
  available: "bg-phase-available",
  planned: "bg-phase-planned",
  finished: "bg-phase-finished",
};

export default function DashboardPage() {
  const { data: backlogs = [] } = useBacklogs();
  const navigate = useNavigate();

  // --- Lógica de Indicadores Estratégicos ---

  // 1. Esforço Total Estimado (Soma das horas do refinamento técnico)
  const totalHours = backlogs.reduce((acc, b) => acc + (b.refinement?.estimate ?? 0), 0);

  // 2. Gargalo Funcional (Aprovados que ainda não entraram em refinamento funcional)
  const functionalGargalo = backlogs.filter((b) => b.phase === "approval").length;

  // 3. Gargalo Técnico (Refinados funcionalmente que aguardam o técnico)
  const technicalGargalo = backlogs.filter((b) => b.phase === "functional_refinement").length;

  // 4. Prontidão para Sprint (Disponíveis / Total em andamento)
  const readyForSprint = backlogs.filter((b) => b.phase === "available").length;

  // 5. Alta Prioridade Travada (Alta prioridade que não está "Disponível" nem "Finalizado")
  const stuckHighPriority = backlogs.filter(
    (b) => b.prioritization?.priority === "high" && b.phase !== "available" && b.phase !== "finished",
  ).length;

  const phaseCounts = PHASES.map((p) => ({
    phase: p,
    count: backlogs.filter((b) => b.phase === p).length,
  }));
  const maxCount = Math.max(...phaseCounts.map((p) => p.count), 1);

  return (
    <div className="fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Estratégico</h1>
          <p className="text-sm text-muted-foreground mt-1">Status de saúde do fluxo FadamiFlow</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Esforço em Backlog</p>
          <p className="text-xl font-bold text-primary">{totalHours}h</p>
        </div>
      </div>

      {/* Grid de Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pronto p/ Sprint"
          value={readyForSprint}
          secondary="cards"
          icon={CheckCircle2}
          delay={0}
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Gargalo Funcional"
          value={functionalGargalo}
          icon={FileSearch}
          delay={0.05}
          accent="bg-sky-500/10 text-sky-500"
        />
        <StatCard
          label="Gargalo Técnico"
          value={technicalGargalo}
          icon={Code2}
          delay={0.1}
          accent="bg-indigo-500/10 text-indigo-500"
        />
        <StatCard
          label="Alta Prior. Travada"
          value={stuckHighPriority}
          icon={AlertCircle}
          delay={0.15}
          accent="bg-rose-500/10 text-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Fase */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="neu-card rounded-2xl p-6 lg:col-span-2"
        >
          <h2 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Fluxo de Trabalho
          </h2>
          <div className="space-y-4">
            {phaseCounts.map(({ phase, count }) => (
              <div key={phase} className="flex items-center gap-3 group">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PHASE_DOT[phase]}`} />
                <span className="text-sm text-muted-foreground w-32 flex-shrink-0 group-hover:text-foreground transition-colors">
                  {PHASE_LABELS[phase]}
                </span>
                <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${PHASE_DOT[phase]}`}
                  />
                </div>
                <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerta de Esforço por Prioridade */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="neu-card rounded-2xl p-6"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Ações Urgentes</h2>
          <div className="space-y-3">
            {backlogs
              .filter((b) => b.prioritization?.priority === "high" && b.phase !== "finished")
              .slice(0, 4)
              .map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-foreground/[0.02] border border-border/50">
                  <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${PHASE_DOT[b.phase]} text-white`}
                    >
                      {PHASE_LABELS[b.phase]}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {b.refinement?.estimate ?? 0}h
                    </span>
                  </div>
                </div>
              ))}
            {stuckHighPriority === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs">Nenhum item de alta prioridade travado!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
