import { memo } from "react";
import type { SubItem } from "@/types/backlog";
import { GripVertical, Trash2, Clock, Paperclip } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  item: SubItem;
  onClick: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  dragHandleProps?: any;
}

export const SubItemCard = memo(({ item, onClick, onDelete, readOnly, dragHandleProps }: Props) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 hover:border-primary/20 transition-all cursor-pointer"
    onClick={onClick}
  >
    {/* Drag handle */}
    {!readOnly && (
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>
    )}

    {/* Order Number & Title */}
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-foreground/5 text-[10px] font-bold border border-border/20 text-accent">
        {item.order + 1}
      </span>
      <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
    </div>

    {/* Attachment indicator */}
    {item.attachment && (
      <a
        href={item.attachment}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-primary transition-colors"
        title="Ver anexo"
      >
        <Paperclip className="w-3.5 h-3.5" />
      </a>
    )}

    {/* Estimate badge */}
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
      <Clock className="w-3 h-3" />
      <span className="text-[11px] font-bold">{item.estimate}h</span>
    </div>

    {/* Delete */}
    {!readOnly && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </motion.div>
));
