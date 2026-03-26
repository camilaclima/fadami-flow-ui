import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Priority } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

function calcPriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

const priorityMeta: Record<Priority, { label: string; color: string; glow: string }> = {
  high: { label: "Alta", color: "bg-priority-high/15 text-priority-high", glow: "shadow-[0_0_12px_hsl(var(--priority-high)/0.4)]" },
  medium: { label: "Média", color: "bg-priority-medium/15 text-priority-medium", glow: "shadow-[0_0_12px_hsl(var(--priority-medium)/0.4)]" },
  low: { label: "Baixa", color: "bg-priority-low/15 text-priority-low", glow: "shadow-[0_0_12px_hsl(var(--priority-low)/0.4)]" },
};

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();
  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 3);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 3);
  const [est, setEst] = useState(item.prioritization?.estimate ?? 8);
  const [saving, setSaving] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const priority = useMemo(() => calcPriority(bv, oc, est), [bv, oc, est]);
  const meta = priorityMeta[priority];

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    savePrioritization(item.id, { businessValue: bv, opportunityCost: oc, estimate: est });
    toast.success("Priorizado com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  const SegmentControl = ({
    label,
    value,
    onChange,
    max,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    max: number;
  }) => (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <motion.button
            key={v}
            onClick={() => !readOnly && onChange(v)}
            whileHover={!readOnly ? { scale: 1.1 } : {}}
            whileTap={!readOnly ? { scale: 0.95 } : {}}
            className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all ${
              v === value
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                : v <= value
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            {v}
          </motion.button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <SegmentControl label="Valor de negócio" value={bv} onChange={setBv} max={5} />
      <SegmentControl label="Custo de oportunidade" value={oc} onChange={setOc} max={5} />

      {/* Fibonacci estimation chips */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Estimativa (horas)</span>
        <div className="flex flex-wrap gap-1.5">
          {FIBONACCI.map((v) => (
            <motion.button
              key={v}
              onClick={() => !readOnly && setEst(v)}
              whileHover={!readOnly ? { scale: 1.08 } : {}}
              whileTap={!readOnly ? { scale: 0.95 } : {}}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                v === est
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                  : "bg-secondary text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              {v}h
            </motion.button>
          ))}
        </div>
      </div>

      {/* Live priority badge */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Prioridade calculada:</span>
        <motion.span
          key={priority}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${meta.color} ${meta.glow}`}
        >
          {meta.label}
        </motion.span>
        <button onClick={() => setShowFormula(!showFormula)} className="text-muted-foreground hover:text-foreground transition-colors">
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {showFormula && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 rounded-xl bg-secondary/50 text-[10px] text-muted-foreground font-mono">
              Score = (Valor + Custo) / 2 − Estimativa / 20 → ≥3.5 Alta, ≥2 Média, &lt;2 Baixa
              <br />
              Atual: ({bv} + {oc}) / 2 − {est} / 20 = {((bv + oc) / 2 - est / 20).toFixed(2)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {item.phase === "prioritization" && !readOnly && (
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvar e Priorizar
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
