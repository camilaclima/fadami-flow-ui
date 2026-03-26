import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import { motion } from "framer-motion";

export function ProgressBar({ currentPhase }: { currentPhase: Phase }) {
  const currentIdx = PHASES.indexOf(currentPhase);
  const progress = ((currentIdx + 1) / PHASES.length) * 100;

  return (
    <div className="flex items-center gap-3">
      {PHASES.map((phase, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={phase} className="flex items-center gap-1" style={{ flex: 1 }}>
            <motion.div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                done ? "bg-phase-finished" : active ? "bg-primary" : "bg-border/60"
              }`}
              animate={active ? { scale: [1, 1.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              style={active ? { boxShadow: "0 0 6px hsl(var(--primary) / 0.5)" } : {}}
            />
            {i < PHASES.length - 1 && (
              <div className={`flex-1 h-px ${done ? "bg-phase-finished/60" : "bg-border/30"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
