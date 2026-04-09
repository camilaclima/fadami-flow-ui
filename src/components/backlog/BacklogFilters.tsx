import { useBacklogStore } from "@/store/backlogStore";
import { Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FilterState {
  productId: string | null;
  priority: string | null;
  createdBy: string | null;
  clientId: string | null;
  estimate: string | null;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function BacklogFilters({ filters, onChange }: Props) {
  const products = useBacklogStore((s) => s.products);
  const clients = useBacklogStore((s) => s.clients);
  const backlogs = useBacklogStore((s) => s.backlogs);

  const creators = [...new Set(backlogs.map((b) => b.createdBy))];

  // Extrai estimativas únicas dos backlogs que já passaram pelo refinamento
  const estimateOptions = [
    ...new Set(
      backlogs.map((b) => b.refinement?.estimate).filter((est): est is number => est !== undefined && est !== null),
    ),
  ].sort((a, b) => a - b);

  const hasFilters = filters.productId || filters.priority || filters.createdBy || filters.clientId || filters.estimate;

  const clearAll = () =>
    onChange({
      productId: null,
      priority: null,
      createdBy: null,
      clientId: null,
      estimate: null,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 flex-wrap"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Filtros</span>
      </div>

      <Select
        value={filters.productId ?? "all"}
        onValueChange={(v) => onChange({ ...filters, productId: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs rounded-xl border-border bg-card">
          <SelectValue placeholder="Produto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Produtos</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.clientId ?? "all"}
        onValueChange={(v) => onChange({ ...filters, clientId: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs rounded-xl border-border bg-card">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Clientes</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? "all"}
        onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs rounded-xl border-border bg-card">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="high">🔴 Alta</SelectItem>
          <SelectItem value="medium">🟡 Média</SelectItem>
          <SelectItem value="low">🔵 Baixa</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.createdBy ?? "all"}
        onValueChange={(v) => onChange({ ...filters, createdBy: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs rounded-xl border-border bg-card">
          <SelectValue placeholder="Criador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {creators.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.estimate ?? "all"}
        onValueChange={(v) => onChange({ ...filters, estimate: v === "all" ? null : v })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs rounded-xl border-border bg-card">
          <SelectValue placeholder="Horas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Horas (Todas)</SelectItem>
          {estimateOptions.map((hours) => (
            <SelectItem key={hours} value={hours.toString()}>
              {hours}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AnimatePresence>
        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpar
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
