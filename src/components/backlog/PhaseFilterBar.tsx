import { motion } from "framer-motion";
import type { Phase } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
import { useBacklogStore } from "@/store/backlogStore";
import {
  Layers,
  Scale,
  Eye,
  Wrench,
  CircleCheck,
  CalendarClock,
  Trophy,
} from "lucide-react";

const PHASE_ICONS: Record<Phase, React.ElementType> = {
  prioritization: Scale,
  approval: Eye,
  refinement: Wrench,
  available: CircleCheck,
  planned: CalendarClock,
  finished: Trophy,
};

const PHASE_ICON_COLORS: Record<Phase, string> = {
  prioritization: "text-phase-prioritization",
  approval: "text-phase-approval",
  refinement: "text-phase-refinement",
  available: "text-phase-available",
  planned: "text-phase-planned",
  finished: "text-phase-finished",
};

const PHASE_BG_COLORS: Record<Phase, string> = {
  prioritization: "bg-phase-prioritization/10",
  approval: "bg-phase-approval/10",
  refinement: "bg-phase-refinement/10",
  available: "bg-phase-available/10",
  planned: "bg-phase-planned/10",
  finished: "bg-phase-finished/10",
};

interface Props {
  selected: Phase | "all";
  onSelect: (phase: Phase | "all") => void;
}

export function PhaseFilterBar({ selected, onSelect }: Props) {
  const backlogs = useBacklogStore((s) => s.backlogs);
  const total = backlogs.length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0 scrollbar-none">
      {/* Total button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("all")}
        className={`relative flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 flex-shrink-0 neu-card-hover ${
          selected === "all"
            ? "glow-active bg-card"
            : "neu-card hover:border-primary/20"
        }`}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-xl font-bold text-foreground leading-none">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
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
            className={`relative flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 flex-shrink-0 neu-card-hover ${
              isActive
                ? "glow-active bg-card"
                : "neu-card hover:border-primary/20"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl ${PHASE_BG_COLORS[phase]} flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${PHASE_ICON_COLORS[phase]}`} />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold text-foreground leading-none">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{PHASE_LABELS[phase]}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
