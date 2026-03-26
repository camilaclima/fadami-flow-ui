import { useState, useMemo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem } from "@/types/backlog";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

type Priority = "high" | "medium" | "low" | "none";

const ESTIMATION_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 24];

function calcPriority(bv: number, oc: number, urg: number, est: number): Priority {
  if (est === 0 || (bv === 0 && oc === 0 && urg === 0)) return "none";

  const score = (bv + oc + urg) / est;
  const totalValue = bv + oc + urg;

  // Régua mais "rígida" para filtrar o backlog
  if (score >= 0.6 && totalValue >= 4) return "high";
  if (score >= 0.26) return "medium";
  return "low";
}

const priorityMeta: Record<Priority, { label: string; color: string; border: string; bg: string }> = {
  high: { label: "Prioridade Alta", color: "text-red-500", border: "border-red-500/30", bg: "bg-red-500/5" },
  medium: { label: "Prioridade Média", color: "text-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  low: { label: "Prioridade Baixa", color: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5" },
  none: { label: "Aguardando Análise", color: "text-muted-foreground", border: "border-border", bg: "bg-secondary/20" },
};

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();

  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 0);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 0);
  // @ts-ignore
  const [urg, setUrg] = useState(item.prioritization?.urgency ?? 0);
  const [est, setEst] = useState(item.prioritization?.estimate ?? 0);
  const [saving, setSaving] = useState(false);

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

  const fieldGuides = {
    bv: "Impacto no cliente/faturamento e resolução de dores reais.",
    oc: "O que perdemos por não fazer isso agora (lucro cessante).",
    urg: "Prazo regulatório ou risco técnico que pode quebrar o sistema.",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {[
          { id: "bv" as const, label: "Valor de negócio", val: bv, set: setBv },
          { id: "oc" as const, label: "Custo de oportunidade", val: oc, set: setOc },
          { id: "urg" as const, label: "Urgência / Risco", val: urg, set: setUrg },
        ].map((field) => (
          <div key={field.id} className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] text-foreground uppercase tracking-wider font-black">{field.label}</span>
                <p className="text-[10px] text-muted-foreground/70 truncate">{fieldGuides[field.id]}</p>
              </div>
              <span className="text-sm font-mono font-bold text-primary">{field.val}</span>
            </div>
            <Slider
              min={0}
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

      <div className="space-y-3 pt-2">
        <span className="text-[11px] text-foreground uppercase tracking-wider font-black">Estimativa (horas)</span>
        <div className="flex flex-wrap gap-2">
          {ESTIMATION_HOURS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => !readOnly && setEst(v)}
              className={`h-9 min-w-[40px] px-2 rounded-lg text-xs font-bold transition-all ${
                v === est
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-transparent"
              }`}
            >
              {v}h
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border/40" />

      <div className="space-y-3">
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${meta.border} ${meta.bg} transition-colors shadow-sm`}
        >
          <div className="flex flex-col">
            <span className={`text-[12px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground/60">
              <Calculator className="w-3 h-3" />
              <span className="text-[10px] font-medium italic">(Valor + Custo + Urgência) / Estimativa</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Score Final</span>
            <span className={`text-2xl font-mono font-black block leading-none ${meta.color}`}>
              {scoreNumber > 0 ? scoreNumber.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <motion.button
          onClick={handleSave}
          disabled={saving || est === 0}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
            est === 0
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/25"
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
