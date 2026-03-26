import { useState } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import { PHASES, PHASE_LABELS, type BacklogItem, type Phase } from "@/types/backlog";
import { BacklogCard } from "./BacklogCard";
import { BacklogDetailModal } from "./BacklogDetailModal";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox } from "lucide-react";

export function KanbanBoard() {
  const backlogs = useBacklogStore((s) => s.backlogs);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 1. Estado para saber qual fase está selecionada no botão lá em cima
  // (Inicia na fase de priorização já que removemos o backlog)
  const [activePhase, setActivePhase] = useState<Phase>("prioritization");

  const openDetail = (item: BacklogItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  // 2. Filtra os itens apenas da fase ativa para mostrar no grid
  const filteredItems = backlogs.filter((b) => b.phase === activePhase);

  return (
    <div className="w-full space-y-8">
      {/* 3. BOTÕES DE FASE (Substituindo as colunas chatas) */}
      <div className="flex flex-wrap gap-3 w-full border-b border-border/40 pb-6">
        {PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm ${
              activePhase === phase
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <span>{PHASE_LABELS[phase]}</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-xs ${activePhase === phase ? "bg-white/20" : "bg-secondary"}`}
            >
              {backlogs.filter((b) => b.phase === phase).length}
            </span>
          </button>
        ))}
      </div>

      {/* 4. O GRID QUE OCUPA A TELA TODA */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full"
          >
            {filteredItems.map((item) => (
              <BacklogCard key={item.id} item={item} onClick={() => openDetail(item)} />
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground bg-secondary/20 rounded-3xl border-2 border-dashed border-border/50">
            <Inbox className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum backlog em {PHASE_LABELS[activePhase]}</p>
          </div>
        )}
      </div>

      <BacklogDetailModal
        item={selectedItem}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) {
            const updated = useBacklogStore.getState().backlogs.find((b) => b.id === selectedItem?.id);
            setSelectedItem(updated ?? null);
          }
        }}
      />
    </div>
  );
}
