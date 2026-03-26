import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { Phase } from "@/types/backlog";
import { PhaseFilterBar } from "@/components/backlog/PhaseFilterBar";
import { BacklogFilters, type FilterState } from "@/components/backlog/BacklogFilters";
import { BacklogListCard } from "@/components/backlog/BacklogListCard";
import { BacklogDetailModal } from "@/components/backlog/BacklogDetailModal";
import { NewBacklogModal } from "@/components/backlog/NewBacklogModal";
import type { BacklogItem } from "@/types/backlog";
import { Plus, Inbox, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BacklogsPage() {
  const backlogs = useBacklogStore((s) => s.backlogs);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | "all">("all");
  const [filters, setFilters] = useState<FilterState>({
    productId: null,
    priority: null,
    createdBy: null,
  });
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let items = backlogs;
    if (selectedPhase !== "all") {
      items = items.filter((b) => b.phase === selectedPhase);
    }
    if (filters.productId) {
      items = items.filter((b) => b.productId === filters.productId);
    }
    if (filters.priority) {
      items = items.filter((b) => b.prioritization?.priority === filters.priority);
    }
    if (filters.createdBy) {
      items = items.filter((b) => b.createdBy === filters.createdBy);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      );
    }
    return items;
  }, [backlogs, selectedPhase, filters, search]);

  const openDetail = (item: BacklogItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  return (
    <div className="fade-in space-y-3 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backlogs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e acompanhe todos os itens do backlog
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-all hover:opacity-90"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="w-4 h-4" />
          Novo Backlog
        </motion.button>
      </div>

      {/* Phase filter buttons */}
      <PhaseFilterBar selected={selectedPhase} onSelect={setSelectedPhase} />

      {/* Search + Filters row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <BacklogFilters filters={filters} onChange={setFilters} />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar backlogs..."
            className="h-8 pl-8 pr-4 text-xs rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all w-56"
          />
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, i) => (
            <BacklogListCard
              key={item.id}
              item={item}
              index={i}
              onClick={() => openDetail(item)}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 opacity-50" />
            </div>
            <p className="text-sm font-medium">Nenhum backlog encontrado</p>
            <p className="text-xs mt-1 opacity-70">
              Tente ajustar os filtros ou crie um novo backlog
            </p>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <NewBacklogModal open={newOpen} onOpenChange={setNewOpen} />
      <BacklogDetailModal
        item={selectedItem}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v && selectedItem) {
            const updated = useBacklogStore
              .getState()
              .backlogs.find((b) => b.id === selectedItem.id);
            setSelectedItem(updated ?? null);
          }
        }}
      />
    </div>
  );
}
