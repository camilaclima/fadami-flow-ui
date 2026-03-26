import { useState } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import { PHASES, PHASE_LABELS, type BacklogItem } from "@/types/backlog";
import { BacklogCard } from "./BacklogCard";
import { BacklogDetailModal } from "./BacklogDetailModal";
import { AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";

const PHASE_DOT_COLORS: Record<string, string> = {
  backlog: "bg-phase-backlog",
  prioritization: "bg-phase-prioritization",
  approval: "bg-phase-approval",
  refinement: "bg-phase-refinement",
  available: "bg-phase-available",
  planned: "bg-phase-planned",
  finished: "bg-phase-finished",
};

export function KanbanBoard() {
  const backlogs = useBacklogStore((s) => s.backlogs);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (item: BacklogItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-180px)]">
        {PHASES.map((phase) => {
          const items = backlogs.filter((b) => b.phase === phase);
          return (
            <div key={phase} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${PHASE_DOT_COLORS[phase]}`} />
                <h3 className="text-sm font-semibold text-foreground">{PHASE_LABELS[phase]}</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[200px]">
                <AnimatePresence>
                  {items.map((item) => (
                    <BacklogCard key={item.id} item={item} onClick={() => openDetail(item)} />
                  ))}
                </AnimatePresence>

                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Inbox className="w-8 h-8 mb-2 opacity-40" />
                    <span className="text-xs">Nenhum item</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BacklogDetailModal
        item={selectedItem}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) {
            // Refresh selected item from store
            if (selectedItem) {
              const updated = useBacklogStore.getState().backlogs.find((b) => b.id === selectedItem.id);
              setSelectedItem(updated ?? null);
            }
          }
        }}
      />
    </>
  );
}
