import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import { motion } from "framer-motion";

export function ProgressBar({ currentPhase }: { currentPhase: Phase }) {
  const currentIdx = PHASES.indexOf(currentPhase);
  const progress = ((currentIdx + 1) / PHASES.length) * 100;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progresso</span>
        <span className="text-[10px] font-semibold text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="relative h-1 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--phase-finished)))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        {PHASES.map((phase, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={phase} className="flex flex-col items-center gap-1" style={{ width: `${100 / PHASES.length}%` }}>
              <motion.div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-phase-finished" : active ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : "bg-secondary"
                }`}
                animate={active ? { scale: [1, 1.3, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
              <span className={`text-[8px] whitespace-nowrap ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {PHASE_LABELS[phase]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
