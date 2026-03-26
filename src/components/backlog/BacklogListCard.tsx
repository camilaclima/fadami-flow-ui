import { motion } from "framer-motion";
import type { BacklogItem } from "@/types/backlog";
import { PHASE_LABELS } from "@/types/backlog";
import { ThermoBadge, PriorityBadge } from "./Badges";
import { useBacklogStore } from "@/store/backlogStore";
import { Calendar, User, Clock } from "lucide-react";

interface Props {
  item: BacklogItem;
  onClick: () => void;
  index: number;
}

export function BacklogListCard({ item, onClick, index }: Props) {
  const products = useBacklogStore((s) => s.products);
  const clients = useBacklogStore((s) => s.clients);
  const product = products.find((p) => p.id === item.productId);
  const client = item.clientId ? clients.find((c) => c.id === item.clientId) : null;

  const showThermo = item.phase === "backlog" || item.phase === "prioritization";
  const showPriority = !!item.prioritization && item.phase !== "backlog";
  const showEstimate =
    item.refinement?.estimate &&
    ["refinement", "available", "planned", "finished"].includes(item.phase);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className="group neu-card neu-card-hover rounded-2xl p-5 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Phase badge on right */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-primary/8 text-primary border border-primary/15">
            {PHASE_LABELS[item.phase]}
          </span>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {showThermo && <ThermoBadge value={item.thermometer} />}
        {showPriority && <PriorityBadge value={item.prioritization!.priority} />}
        {product && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: product.color }}
            />
            {product.name}
          </span>
        )}
        {client && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground">
            {client.name}
          </span>
        )}
        {showEstimate && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-secondary text-secondary-foreground">
            <Clock className="w-3 h-3" />
            {item.refinement!.estimate}h
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
        <span className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-2.5 h-2.5 text-primary" />
          </div>
          {item.createdBy}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </motion.div>
  );
}
