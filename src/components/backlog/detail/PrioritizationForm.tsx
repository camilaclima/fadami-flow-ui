import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Priority } from "@/types/backlog";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Loader2, CheckCircle2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

// 1. NOVA FUNÇÃO DE CÁLCULO BASEADA NA FÓRMULA DISCUTIDA
function calcPriority(bv: number, oc: number, urg: number, est: number): Priority {
  const score = (bv + oc + urg) / est;
  if (score >= 0.7) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

const priorityMeta: Record<Priority, { label: string; scoreLabel: string; gradient: string }> = {
  high: {
    label: "Prioridade Alta",
    scoreLabel: "Alto ROI / Urgência",
    gradient: "from-[hsl(0_72%_51%)] to-[hsl(330_70%_45%)]",
  },
  medium: {
    label: "Prioridade Média",
    scoreLabel: "Impacto Moderado",
    gradient: "from-[hsl(220_70%_55%)] to-[hsl(240_60%_50%)]",
  },
  low: {
    label: "Prioridade Baixa",
    scoreLabel: "Baixo ROI / Longo Prazo",
    gradient: "from-slate-600 to-slate-800",
  },
};

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();

  // Estados dos Inputs
  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 3);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 3);
  const [urg, setUrg] = useState(3); // NOVO: Urgência/Risco inicial 3
  const [est, setEst] = useState(item.prioritization?.estimate ?? 8);
  const [saving, setSaving] = useState(false);

  // Cálculos Automáticos
  const scoreNumber = useMemo(() => (bv + oc + urg) / est, [bv, oc, urg, est]);
  const priority = useMemo(() => calcPriority(bv, oc, urg, est), [bv, oc, urg, est]);
  const scoreDisplay = scoreNumber.toFixed(2);
  const meta = priorityMeta[priority];

  const handleSave = async () => {
    setSaving(true);
    // Simulação de delay para feedback visual
    await new Promise((r) => setTimeout(r, 600));

    // Salvando os dados (Certifique-se que seu store aceita o campo 'urgency' ou salve nos metadados)
    savePrioritization(item.id, {
      businessValue: bv,
      opportunityCost: oc,
      estimate: est,
      // @ts-ignore - Caso o tipo ainda não tenha sido atualizado no types/backlog.ts
      urgency: urg,
    });

    toast.success("Cálculo de prioridade atualizado!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      {/* Bloco explicativo da Lógica */}
      <div className="bg-secondary/30 p-3 rounded-xl border border-border/50 flex items-start gap-3">
        <Calculator className="w-4 h-4 text-primary mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <strong>Lógica de Cálculo:</strong> A prioridade é definida pela fórmula de ROI Técnico:
          <span className="text-foreground block mt-1 font-mono italic">
            (Valor de Negócio + Custo de Oportunidade + Urgência) / Estimativa em Horas
          </span>
        </p>
      </div>

      {/* Slider: Business Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">
            Valor de negócio
          </span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{bv}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[bv]}
          onValueChange={([v]) => !readOnly && setBv(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        />
      </div>

      {/* Slider: Opportunity Cost */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">
            Custo de oportunidade
          </span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{oc}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[oc]}
          onValueChange={([v]) => !readOnly && setOc(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        />
      </div>

      {/* NOVO: Slider: Urgência e Risco */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">
            Urgência / Risco
          </span>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{urg}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[urg]}
          onValueChange={([v]) => !readOnly && setUrg(v)}
          disabled={readOnly}
          className="[&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        />
      </div>

      {/* Fibonacci Estimation */}
      <div className="space-y-2">
        <span className="text-[11px] text-foreground/70 uppercase tracking-widest font-semibold">
          Estimativa do Time (horas)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FIBONACCI.map((v) => (
            <motion.button
              key={v}
              onClick={() => !readOnly && setEst(v)}
              whileHover={!readOnly ? { scale: 1.05 } : {}}
              whileTap={!readOnly ? { scale: 0.95 } : {}}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                v === est
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
              }`}
            >
              {v}h
            </motion.button>
          ))}
        </div>
      </div>

      {/* RESULTADO DINÂMICO */}
      <AnimatePresence mode="wait">
        <motion.div
          key={priority}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className={`rounded-2xl p-5 bg-gradient-to-br ${meta.gradient} shadow-xl text-white`}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-tight leading-none">{meta.label}</span>
              <span className="text-[10px] text-white/70 font-medium mt-1">{meta.scoreLabel}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] opacity-60 uppercase block">Score Final</span>
              <span className="text-2xl font-mono font-bold">{scoreDisplay}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono opacity-80">
            <span>
              ({bv} + {oc} + {urg}) / {est}
            </span>
            <span className="bg-white/10 px-2 py-1 rounded">Cálculo ROI Automático</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Ação de Salvar */}
      {!readOnly && (
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Finalizar Priorização
        </motion.button>
      )}
    </div>
  );
}
