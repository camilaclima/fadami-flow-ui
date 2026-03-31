import { useState, useMemo, useCallback } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, SubItem } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { SubItemFormModal } from "./SubItemFormModal";
import { SubItemCard } from "./SubItemCard";

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function RefinementForm({ item, onSaved, readOnly }: Props) {
  const { addSubItem, updateSubItem, deleteSubItem, reorderSubItems, completeRefinement } =
    useBacklogStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const subItems = useMemo(
    () => [...(item.refinement?.subItems ?? [])].sort((a, b) => a.order - b.order),
    [item.refinement?.subItems]
  );

  const totalHours = useMemo(
    () => subItems.reduce((sum, si) => sum + si.estimate, 0),
    [subItems]
  );

  const handleAddOrEdit = useCallback(
    (data: Omit<SubItem, "id" | "order">) => {
      if (editingItem) {
        updateSubItem(item.id, editingItem.id, data);
        toast.success("Subitem atualizado!");
      } else {
        addSubItem(item.id, data);
        toast.success("Subitem adicionado!");
      }
      setEditingItem(null);
    },
    [editingItem, item.id, addSubItem, updateSubItem]
  );

  const handleDelete = useCallback(
    (subItemId: string) => {
      deleteSubItem(item.id, subItemId);
      toast.success("Subitem removido.");
    },
    [item.id, deleteSubItem]
  );

  const handleComplete = async () => {
    if (subItems.length === 0) {
      toast.error("Adicione pelo menos um subitem.");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    completeRefinement(item.id);
    toast.success("Refinamento concluído!");
    onSaved?.();
    setSaving(false);
  };

  // Simple drag-and-drop via HTML5 API
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const ids = subItems.map((si) => si.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, draggedId);
    reorderSubItems(item.id, newIds);
  };
  const handleDragEnd = () => setDraggedId(null);

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">
            Subitens
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-bold">Total Estimado: {totalHours}h</span>
          </div>
        </div>
      </div>

      {/* Add button */}
      {!readOnly && (
        <motion.button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 hover:border-primary/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Subitem
        </motion.button>
      )}

      {/* Sub-items list */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {subItems.map((si) => (
            <div
              key={si.id}
              draggable={!readOnly}
              onDragStart={() => handleDragStart(si.id)}
              onDragOver={(e) => handleDragOver(e, si.id)}
              onDragEnd={handleDragEnd}
            >
              <SubItemCard
                item={si}
                readOnly={readOnly}
                onClick={() => {
                  setEditingItem(si);
                  setModalOpen(true);
                }}
                onDelete={() => handleDelete(si.id)}
              />
            </div>
          ))}
        </AnimatePresence>

        {subItems.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-4 italic">
            Nenhum subitem cadastrado.
          </p>
        )}
      </div>

      {/* Complete refinement */}
      {item.phase === "refinement" && !readOnly && (
        <motion.button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Finalizando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Concluir Refinamento
            </>
          )}
        </motion.button>
      )}

      {/* Modal */}
      <SubItemFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleAddOrEdit}
        editItem={editingItem}
      />
    </div>
  );
}
