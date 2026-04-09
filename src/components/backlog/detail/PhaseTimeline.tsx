import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import { motion } from "framer-motion";
import {
  Settings2,
  CheckCircle,
  Wrench,
  Clock,
  CalendarCheck,
  Flag,
  FileText,
  Code2,
} from "lucide-react";

const PHASE_ICONS: Record<Phase, React.ReactNode> = {
  prioritization: <Settings2 className="w-3 h-3" />,
  approval: <CheckCircle className="w-3 h-3" />,
  functional_refinement: <FileText className="w-3 h-3" />,
  technical_refinement: <Code2 className="w-3 h-3" />,
  available: <Clock className="w-3 h-3" />,
  planned: <CalendarCheck className="w-3 h-3" />,
  finished: <Flag className="w-3 h-3" />,
};

export function PhaseTimeline({ currentPhase }: { currentPhase: Phase }) {
  const currentIdx = PHASES.indexOf(currentPhase);

  return (
    <div className="flex items-center w-full">
      {PHASES.map((phase, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={phase} className="flex items-center" style={{ flex: 1 }}>
            {/* Node */}
            <div className="flex flex-col items-center gap-1 relative">
              <motion.div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  done
                    ? "bg-phase-finished text-phase-finished-foreground"
                    : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
                animate={active ? { boxShadow: ["0 0 0px hsl(var(--primary) / 0)", "0 0 12px hsl(var(--primary) / 0.5)", "0 0 0px hsl(var(--primary) / 0)"] } : {}}
                transition={active ? { repeat: Infinity, duration: 2.5 } : {}}
              >
                {done ? <CheckCircle className="w-3.5 h-3.5" /> : PHASE_ICONS[phase]}
              </motion.div>
              <span
                className={`text-[9px] font-semibold tracking-wide whitespace-nowrap ${
                  active ? "text-primary" : done ? "text-foreground/70" : "text-muted-foreground/50"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>

            {/* Connecting line */}
            {i < PHASES.length - 1 && (
              <div className="flex-1 h-px mx-1 relative">
                <div className="absolute inset-0 bg-border/30" />
                {done && (
                  <motion.div
                    className="absolute inset-y-0 left-0 right-0 bg-phase-finished/60"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
