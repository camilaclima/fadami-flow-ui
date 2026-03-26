import { useState } from "react";
import { KanbanBoard } from "@/components/backlog/KanbanBoard";
import { NewBacklogModal } from "@/components/backlog/NewBacklogModal";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function BacklogsPage() {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backlogs</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe todos os itens do backlog</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Backlog
        </motion.button>
      </div>

      <KanbanBoard />
      <NewBacklogModal open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
