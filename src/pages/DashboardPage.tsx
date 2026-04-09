import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import { BarChart3, ListTodo, TrendingUp, CheckCircle2, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function StatCard({
  label,
  value,
  icon: Icon,
  delay,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  delay: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card neu-card-hover rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${accent ? "text-foreground" : "text-primary"}`} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
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

  const total = backlogs.length;
  const highPriority = backlogs.filter((b) => b.prioritization?.priority === "high").length;
  const finished = backlogs.filter((b) => b.phase === "finished").length;
  const inProgress = total - finished;

  const phaseCounts = PHASES.map((p) => ({
    phase: p,
    count: backlogs.filter((b) => b.phase === p).length,
  }));
  const maxCount = Math.max(...phaseCounts.map((p) => p.count), 1);

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do seu backlog de produto</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Backlogs" value={total} icon={ListTodo} delay={0} />
        <StatCard label="Em Andamento" value={inProgress} icon={TrendingUp} delay={0.05} />
        <StatCard label="Alta Prioridade" value={highPriority} icon={BarChart3} delay={0.1} />
        <StatCard label="Finalizados" value={finished} icon={CheckCircle2} delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="neu-card rounded-2xl p-6"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Fase</h2>
        <div className="space-y-3">
          {phaseCounts.map(({ phase, count }) => (
            <div key={phase} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PHASE_DOT[phase]}`} />
              <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{PHASE_LABELS[phase]}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className={`h-full rounded-full ${PHASE_DOT[phase]}`}
                />
              </div>
              <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="neu-card rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Backlogs Recentes</h2>
          <button onClick={() => navigate("/backlogs")} className="text-xs text-primary hover:underline">
            Ver todos →
          </button>
        </div>
        <div className="space-y-1">
          {backlogs.slice(0, 5).map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
              onClick={() => navigate("/backlogs")}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${PHASE_DOT[b.phase as Phase]}`} />
                <span className="text-sm text-foreground">{b.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{PHASE_LABELS[b.phase as Phase]}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
