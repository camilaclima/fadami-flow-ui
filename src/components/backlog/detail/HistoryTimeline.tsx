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
  type EntryType = "enter" | "complete";
  const entries: { action: string; date: string; type: EntryType }[] = history.flatMap((h) => {
    const items: { action: string; date: string; type: EntryType }[] = [
      { action: `Entrou em ${PHASE_LABELS[h.phase]}`, date: h.enteredAt, type: "enter" },
    ];
    if (h.completedAt) {
      items.push({
        action: `Concluiu ${PHASE_LABELS[h.phase]}`,
        date: h.completedAt,
        type: "complete",
      });
    }
    return items;
  });

  return (
    <div className="relative pl-8">
      {/* Thin connecting line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-border/40 to-transparent" />

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground py-6 pl-2">Nenhum histórico ainda.</p>
      )}

      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="relative flex items-start gap-4 py-3"
        >
          {/* Node */}
          <div className="absolute -left-8 top-3.5 flex items-center justify-center">
            {entry.type === "complete" ? (
              <div className="w-[9px] h-[9px] rounded-full bg-phase-finished shadow-[0_0_6px_hsl(var(--phase-finished)/0.4)]" />
            ) : (
              <div className="w-[9px] h-[9px] rounded-full border-2 border-primary bg-card shadow-[0_0_6px_hsl(var(--primary)/0.3)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-primary">{createdBy[0]}</span>
              </div>
              <p className="text-xs text-foreground font-medium">{entry.action}</p>
              {entry.type === "complete" && (
                <span className="text-[8px] font-bold uppercase tracking-widest bg-phase-finished/10 text-phase-finished px-1.5 py-0.5 rounded">
                  Done
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-7">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/60 font-mono">{formatRelative(entry.date)}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
