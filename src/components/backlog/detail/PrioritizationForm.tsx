import { useState, useEffect, memo } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Priority } from "@/types/backlog";
import { motion } from "framer-motion";
import { Calculator, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

// --- COMPONENTE DE SLIDER EXTRAÍDO (Estabilidade de Foco) ---
const GUTSlider = memo(
  ({
    label,
    value,
    onChange,
    color,
    readOnly,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    color: string;
    readOnly?: boolean;
  }) => (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-bold">{label}</span>
        <span className="text-sm font-black px-2 py-0.5 rounded-md bg-secondary" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-foreground/[0.05] accent-primary transition-all"
        style={{
          background: `linear-gradient(to right, ${color} ${(value - 1) * 25}%, rgba(0,0,0,0.05) ${(value - 1) * 25}%)`,
        }}
      />
    </div>
  ),
);

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();

  // Tratando o objeto como 'any' para evitar erros de propriedade inexistente no TS
  const currentPrio = (item.prioritization || {}) as any;

  // Estados locais baseados na Matriz GUT
  const [g, setG] = useState(currentPrio.gravity || 1);
  const [u, setU] = useState(currentPrio.urgency || 1);
  const [t, setT] = useState(currentPrio.tendency || 1);
  const [saving, setSaving] = useState(false);

  // Cálculo do Score (G x U x T)
  const score = g * u * t;

  const getPriorityClass = (s: number): Priority => {
    if (s >= 60) return "high";
    if (s >= 20) return "medium";
    return "low";
  };

  const priority = getPriorityClass(score);

  // Sincroniza se o item mudar no modal
  useEffect(() => {
    const p = (item.prioritization || {}) as any;
    setG(p.gravity || 1);
    setU(p.urgency || 1);
    setT(p.tendency || 1);
  }, [item.id]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    // Forçamos o objeto para 'any' no savePrioritization para aceitar os campos GUT
    savePrioritization(item.id, {
      gravity: g,
      urgency: u,
      tendency: t,
      calculatedPriority: score,
      priority: priority,
    } as any);

    toast.success("Priorização aplicada!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SEÇÃO DOS 3 CAMPOS (GUT) */}
      <div className="space-y-6">
        <GUTSlider label="Gravidade (Impacto)" value={g} onChange={setG} color="#ef4444" readOnly={readOnly} />
        <GUTSlider label="Urgência (Prazo)" value={u} onChange={setU} color="#f59e0b" readOnly={readOnly} />
        <GUTSlider label="Tendência (Evolução)" value={t} onChange={setT} color="#3b82f6" readOnly={readOnly} />
      </div>

      {/* CARD DE SCORE CALCULADO */}
      <motion.div
        layout
        className="relative overflow-hidden p-6 rounded-2xl bg-foreground/[0.02] border border-border/50"
      >
        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1.5">
              <Calculator className="w-3 h-3" /> Score Calculado
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground tracking-tighter">{score}</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase">G × U × T</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">
              Prioridade
            </span>
            <span
              className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl border shadow-sm ${
                priority === "high"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : priority === "medium"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }`}
            >
              {priority}
            </span>
          </div>
        </div>

        {/* Barra de progresso visual */}
        <div className="mt-5 h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${(score / 125) * 100}%` }}
            className={`h-full transition-colors duration-500 ${
              priority === "high" ? "bg-red-500" : priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
        </div>
      </motion.div>

      {/* BOTÃO DE SALVAR */}
      {item.phase === "prioritization" && !readOnly && (
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(var(--primary),0.3)]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Aplicar Priorização
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
