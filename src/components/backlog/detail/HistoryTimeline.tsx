import type { PhaseHistory } from "@/types/backlog";
import { PHASE_LABELS } from "@/types/backlog";
import { User, Clock } from "lucide-react";
import { motion } from "framer-motion";

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

interface Props {
  history: PhaseHistory[];
  createdBy: string;
}

export function HistoryTimeline({ history, createdBy }: Props) {
  const entries = history.flatMap((h) => {
    const items = [
      { action: `Entrou em ${PHASE_LABELS[h.phase]}`, date: h.enteredAt, type: "enter" as const },
    ];
    if (h.completedAt) {
      items.push({
        action: `Concluiu ${PHASE_LABELS[h.phase]}`,
        date: h.completedAt,
        type: "complete" as const,
      });
    }
    return items;
  });

  return (
    <div className="relative pl-6 space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="relative flex items-start gap-3 py-2.5"
        >
          {/* Dot */}
          <div
            className={`absolute -left-6 top-3 w-[7px] h-[7px] rounded-full border-2 ${
              entry.type === "complete"
                ? "bg-phase-finished border-phase-finished"
                : "bg-card border-primary"
            }`}
          />

          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground leading-tight">{entry.action}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <User className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{createdBy}</span>
              <Clock className="w-2.5 h-2.5 text-muted-foreground ml-1" />
              <span className="text-[10px] text-muted-foreground">{formatRelative(entry.date)}</span>
            </div>
          </div>
        </motion.div>
      ))}

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground py-4">Nenhum histórico ainda.</p>
      )}
    </div>
  );
}
