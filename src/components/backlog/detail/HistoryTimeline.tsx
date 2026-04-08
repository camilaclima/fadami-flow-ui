import type { PhaseHistory } from "@/types/backlog";
import { PHASE_LABELS } from "@/types/backlog";
import { Clock } from "lucide-react";
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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  history: PhaseHistory[];
  createdBy: string;
}

export function HistoryTimeline({ history, createdBy }: Props) {
  // Build grouped entries per phase transition
  const entries = history.map((h) => ({
    phase: h.phase,
    label: PHASE_LABELS[h.phase],
    enteredAt: h.enteredAt,
    completedAt: h.completedAt,
    action: h.completedAt
      ? `Concluiu fase ${PHASE_LABELS[h.phase]}`
      : `Status alterado para ${PHASE_LABELS[h.phase]}`,
    date: h.completedAt ?? h.enteredAt,
  }));

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border/30 to-transparent" />

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground py-4">Nenhum histórico ainda.</p>
      )}

      {entries.map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className="relative flex items-start gap-3 py-2.5"
        >
          {/* Node */}
          <div className="absolute -left-6 top-3 flex items-center justify-center">
            {entry.completedAt ? (
              <div className="w-[10px] h-[10px] rounded-full bg-phase-finished shadow-[0_0_6px_hsl(var(--phase-finished)/0.4)]" />
            ) : (
              <div className="w-[10px] h-[10px] rounded-full border-2 border-primary bg-card shadow-[0_0_6px_hsl(var(--primary)/0.3)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Action line */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                {createdBy[0]}
              </span>
              <span className="text-[11px] text-foreground font-medium">{createdBy}</span>
              {entry.completedAt && (
                <span className="text-[8px] font-bold uppercase tracking-widest bg-phase-finished/15 text-phase-finished px-1.5 py-0.5 rounded">
                  Concluído
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-foreground/70 mt-0.5 ml-7">{entry.action}</p>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 mt-1 ml-7">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/60 font-mono">{formatDateTime(entry.date)}</span>
              <span className="text-[10px] text-muted-foreground/40 font-mono">· {formatRelative(entry.date)}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
