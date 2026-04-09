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

const PHASE_COLORS: Record<Phase, string> = {
  prioritization: "primary",
  approval: "amber-500",
  functional_refinement: "blue-500",
  technical_refinement: "indigo-500",
  available: "emerald-500",
  planned: "orange-500",
  finished: "purple-500",
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
        onClick={() => onSelect("all")}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all neu-card ${selected === "all" ? "bg-card shadow-lg ring-1 ring-primary/20" : "hover:bg-accent"}`}
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
            onClick={() => onSelect(phase)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all neu-card ${isActive ? "bg-card shadow-lg ring-1 ring-primary/20" : "hover:bg-accent"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${PHASE_COLORS[phase]}/10`}>
              <Icon className={`w-5 h-5 text-${PHASE_COLORS[phase]}`} />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold leading-none">{count}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                {PHASE_LABELS[phase].split(". ")[1]}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
