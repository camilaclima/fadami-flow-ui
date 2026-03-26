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

const priorityMeta: Record<Priority, { label: string; scoreLabel: string; gradient: string; solidBg: string }> = {
  high: {
    label: "Alta",
    scoreLabel: "High Priority",
    gradient: "from-priority-high to-[hsl(0_72%_45%)]",
    solidBg: "bg-priority-high",
  },
  medium: {
    label: "Média",
    scoreLabel: "Medium Priority",
    gradient: "from-priority-medium to-[hsl(220_70%_50%)]",
    solidBg: "bg-priority-medium",
  },
  low: {
    label: "Baixa",
    scoreLabel: "Low Priority",
    gradient: "from-primary to-[hsl(262_60%_50%)]",
    solidBg: "bg-primary",
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
    <div className="space-y-5">
      {/* Slider: Business Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">Valor de negócio</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{bv}</span>
        </div>
        <Slider
          min={1} max={5} step={1}
          value={[bv]}
          onValueChange={([v]) => !readOnly && setBv(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)] [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Slider: Opportunity Cost */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">Custo de oportunidade</span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{oc}</span>
        </div>
        <Slider
          min={1} max={5} step={1}
          value={[oc]}
          onValueChange={([v]) => !readOnly && setOc(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)] [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Fibonacci Estimation */}
      <div className="space-y-2">
        <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">Estimativa (horas)</span>
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
                  : "bg-secondary/60 text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`}
            >
              {v}h
            </motion.button>
          ))}
        </div>
      </div>

      {/* Priority result — high contrast solid badge */}
      <motion.div
        key={priority}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-2xl p-4 bg-gradient-to-br ${meta.gradient} shadow-lg`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold text-white tracking-tight">{meta.label}</span>
          <span className="text-[10px] font-mono text-white/70 bg-white/10 px-2 py-0.5 rounded-md">
            Score: {score}
          </span>
        </div>
        <p className="text-[10px] text-white/60 font-mono mt-1">
          ({bv} + {oc}) / 2 − {est} / 20 = {score} → {meta.scoreLabel}
        </p>
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
