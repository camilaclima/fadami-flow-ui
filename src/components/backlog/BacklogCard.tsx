import { motion } from "framer-motion";
import type { BacklogItem } from "@/types/backlog";
import { ThermoBadge, PriorityBadge } from "./Badges";
import { useBacklogStore } from "@/store/backlogStore";
import { Calendar, User } from "lucide-react";

interface Props {
  item: BacklogItem;
  onClick: () => void;
}

export function BacklogCard({ item, onClick }: Props) {
  const products = useBacklogStore((s) => s.products);
  const product = products.find((p) => p.id === item.productId);
  const showThermo = item.phase === "prioritization";
  const showPriority = !!item.prioritization;
  const showEstimate =
    item.refinement?.estimate &&
    ["refinement", "available", "planned", "finished"].includes(item.phase);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -8px rgba(0,0,0,0.15)" }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-4 cursor-pointer transition-colors hover:border-primary/30 space-y-3"
    >
      <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.title}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {showThermo && <ThermoBadge value={item.thermometer} />}
        {showPriority && <PriorityBadge value={item.prioritization!.priority} />}
        {product && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
            {product.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {item.createdBy}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(item.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {showEstimate && (
        <div className="text-xs text-muted-foreground">
          ⏱ {item.refinement!.estimate}h estimadas
        </div>
      )}
    </motion.div>
  );
}
