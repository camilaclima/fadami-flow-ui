import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Priority } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

function calcPriority(bv: number, oc: number, est: number): Priority {
  const score = (bv + oc) / 2 - est / 20;
  if (score >= 3.5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

const priorityMeta: Record<Priority, { label: string; scoreLabel: string; bg: string; text: string; glow: string }> = {
  high: {
    label: "Alta",
    scoreLabel: "High Priority",
    bg: "bg-priority-high/10",
    text: "text-priority-high",
    glow: "shadow-[0_0_16px_hsl(var(--priority-high)/0.3)]",
  },
  medium: {
    label: "Média",
    scoreLabel: "Medium Priority",
    bg: "bg-priority-medium/10",
    text: "text-priority-medium",
    glow: "shadow-[0_0_16px_hsl(var(--priority-medium)/0.3)]",
  },
  low: {
    label: "Baixa",
    scoreLabel: "Low Priority",
    bg: "bg-priority-low/10",
    text: "text-priority-low",
    glow: "shadow-[0_0_16px_hsl(var(--priority-low)/0.3)]",
  },
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
  const score = useMemo(() => ((bv + oc) / 2 - est / 20).toFixed(1), [bv, oc, est]);
  const meta = priorityMeta[priority];

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    savePrioritization(item.id, { businessValue: bv, opportunityCost: oc, estimate: est });
    toast.success("Priorizado com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      {/* Slider: Business Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">Valor de negócio</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{bv}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[bv]}
          onValueChange={([v]) => !readOnly && setBv(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)] [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Slider: Opportunity Cost */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">Custo de oportunidade</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{oc}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[oc]}
          onValueChange={([v]) => !readOnly && setOc(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)] [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Fibonacci Estimation */}
      <div className="space-y-2">
        <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">Estimativa (horas)</span>
        <div className="flex flex-wrap gap-1.5">
          {FIBONACCI.map((v) => (
            <motion.button
              key={v}
              onClick={() => !readOnly && setEst(v)}
              whileHover={!readOnly ? { scale: 1.08 } : {}}
              whileTap={!readOnly ? { scale: 0.95 } : {}}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                v === est
                  ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                  : "bg-secondary/60 text-foreground/60 hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {v}h
            </motion.button>
          ))}
        </div>
      </div>

      {/* Priority result — floating card */}
      <motion.div
        key={priority}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-2xl p-4 ${meta.bg} ${meta.glow} transition-shadow`}
        style={{ background: `linear-gradient(135deg, hsl(var(--card)), hsl(var(--secondary) / 0.6))` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-sm font-bold ${meta.text}`}>{meta.label}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Score: {score} — {meta.scoreLabel}
            </p>
          </div>
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary"
          >
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
              <p className="text-[9px] text-muted-foreground font-mono mt-2 pt-2 border-t border-border/30">
                (Valor + Custo) / 2 − Estimativa / 20 → ≥3.5 Alta, ≥2 Média, &lt;2 Baixa
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {item.phase === "prioritization" && !readOnly && (
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Salvar e Priorizar</>
          )}
        </motion.button>
      )}
    </div>
  );
}
