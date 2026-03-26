import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Priority } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Escala linear até 10h + 16h (2 dias) e 24h (3 dias)
const ESTIMATION_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 24];

function calcPriority(bv: number, oc: number, urg: number, est: number): Priority {
  if (est === 0) return "low";
  const score = (bv + oc + urg) / est;
  if (score >= 0.7) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

const priorityMeta: Record<Priority, { label: string; color: string; border: string; bg: string }> = {
  high: {
    label: "Prioridade Alta",
    color: "text-red-500",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
  },
  medium: {
    label: "Prioridade Média",
    color: "text-amber-500",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
  },
  low: {
    label: "Prioridade Baixa",
    color: "text-blue-500",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
  },
};

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();

  // Estados iniciando no valor mínimo (zerados visualmente)
  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 1);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 1);
  // @ts-ignore - lidando com a falta do campo no tipo oficial por enquanto
  const [urg, setUrg] = useState(item.prioritization?.urgency ?? 1);
  const [est, setEst] = useState(item.prioritization?.estimate ?? 0);
  const [saving, setSaving] = useState(false);

  // Cálculos Automáticos com trava para divisão por zero
  const scoreNumber = useMemo(() => {
    if (est === 0) return 0;
    return (bv + oc + urg) / est;
  }, [bv, oc, urg, est]);

  const priority = useMemo(() => calcPriority(bv, oc, urg, est), [bv, oc, urg, est]);
  const meta = priorityMeta[priority];

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    savePrioritization(item.id, {
      businessValue: bv,
      opportunityCost: oc,
      estimate: est,
      // @ts-ignore
      urgency: urg,
    });

    toast.success("Prioridade salva com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      {/* Sliders de Input */}
      <div className="space-y-4">
        {[
          { label: "Valor de negócio", val: bv, set: setBv },
          { label: "Custo de oportunidade", val: oc, set: setOc },
          { label: "Urgência / Risco", val: urg, set: setUrg },
        ].map((field) => (
          <div key={field.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {field.label}
              </span>
              <span className="text-xs font-bold text-primary">{field.val}</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[field.val]}
              onValueChange={([v]) => !readOnly && field.set(v)}
              disabled={readOnly}
              className="py-2"
            />
          </div>
        ))}
      </div>

      {/* Estimativa de Horas Linear */}
      <div className="space-y-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Estimativa (horas)
        </span>
        <div className="flex flex-wrap gap-2">
          {ESTIMATION_HOURS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => !readOnly && setEst(v)}
              className={`h-8 min-w-[38px] px-2 rounded-lg text-[11px] font-bold transition-all ${
                v === est
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {v}h
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border/50" />

      {/* RESULTADO DISCRETO */}
      <div className="space-y-3">
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${meta.border} ${meta.bg} transition-colors`}
        >
          <div className="flex flex-col">
            <span className={`text-sm font-bold uppercase tracking-tight ${meta.color}`}>{meta.label}</span>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <Calculator className="w-3 h-3" />
              <span className="text-[10px]">(Valor + Custo + Urgência) / Estimativa</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Score</span>
            <span className={`text-xl font-mono font-black ${meta.color}`}>{scoreNumber.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botão de Ação com trava de segurança */}
      {!readOnly && (
        <motion.button
          onClick={handleSave}
          disabled={saving || est === 0}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            est === 0
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : est === 0 ? (
            "Selecione a Estimativa"
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvar Priorização
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
