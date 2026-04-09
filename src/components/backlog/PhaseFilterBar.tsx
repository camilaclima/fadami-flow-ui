import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Phase } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
import { useBacklogStore } from "@/store/backlogStore";
import { Layers, Scale, Eye, FileText, Code2, CircleCheck, CalendarClock, Trophy } from "lucide-react";

const PHASE_ICONS: Record<Phase, React.ElementType> = {
  prioritization: Scale,
  approval: Eye,
  functional_refinement: FileText,
  technical_refinement: Code2,
  available: CircleCheck,
  planned: CalendarClock,
  finished: Trophy,
};

// Cores baseadas nas suas classes tailwind
const PHASE_COLORS: Record<Phase, string> = {
  prioritization: "text-blue-500",
  approval: "text-amber-500",
  functional_refinement: "text-sky-500",
  technical_refinement: "text-indigo-500",
  available: "text-emerald-500",
  planned: "text-orange-500",
  finished: "text-purple-500",
};

export function PhaseFilterBar({
  selected,
  onSelect,
}: {
  selected: Phase | "all";
  onSelect: (p: Phase | "all") => void;
}) {
  const { backlogs, fetchAll, initialized } = useBacklogStore();

  useEffect(() => {
    if (!initialized) fetchAll();
  }, [initialized, fetchAll]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 w-full">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("all")}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${selected === "all" ? "bg-card shadow-lg ring-1 ring-primary/20" : "bg-card/50 hover:bg-card"}`}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-xl font-bold leading-none">{backlogs.length}</p>
          <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Total</p>
        </div>
      </motion.button>

      {PHASES.map((phase) => {
        const count = backlogs.filter((b) => b.phase === phase).length;
        const Icon = PHASE_ICONS[phase];
        const isActive = selected === phase;

        return (
          <motion.button
            key={phase}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(phase)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive ? "bg-card shadow-lg ring-1 ring-primary/20" : "bg-card/50 hover:bg-card"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-foreground/5`}>
              <Icon className={`w-5 h-5 ${PHASE_COLORS[phase]}`} />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold leading-none">{count}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                {PHASE_LABELS[phase].replace(/^\d+\.\s/, "")}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
