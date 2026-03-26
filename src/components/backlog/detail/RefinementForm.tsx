import { useState, useEffect } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem } from "@/types/backlog";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

// --- COMPONENTE EXTRAÍDO PARA FORA (CORRIGE O FOCO) ---
const PremiumTextArea = ({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  readOnly?: boolean;
}) => (
  <div className="space-y-1.5">
    <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">{label}</span>
    <textarea
      value={value}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      readOnly={readOnly}
      rows={2}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-foreground/[0.04] text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_hsl(var(--primary)/0.1)] resize-none transition-all border-0"
    />
  </div>
);

export function RefinementForm({ item, onSaved, readOnly }: Props) {
  const { saveRefinement } = useBacklogStore();

  // Estados locais para digitação fluida
  const [fr, setFr] = useState(item.refinement?.functionalRefinement ?? "");
  const [tr, setTr] = useState(item.refinement?.technicalRefinement ?? "");
  const [ac, setAc] = useState(item.refinement?.acceptanceCriteria ?? "");
  const [dod, setDod] = useState(item.refinement?.definitionOfDone ?? "");
  const [est, setEst] = useState(item.refinement?.estimate ?? 8);
  const [saving, setSaving] = useState(false);

  // Sincroniza apenas quando o item (ID) mudar, para não resetar enquanto digita
  useEffect(() => {
    setFr(item.refinement?.functionalRefinement ?? "");
    setTr(item.refinement?.technicalRefinement ?? "");
    setAc(item.refinement?.acceptanceCriteria ?? "");
    setDod(item.refinement?.definitionOfDone ?? "");
    setEst(item.refinement?.estimate ?? 8);
  }, [item.id]);

  const handleSave = async () => {
    if (!fr || !tr || !ac || !dod) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      saveRefinement(item.id, {
        functionalRefinement: fr,
        technicalRefinement: tr,
        acceptanceCriteria: ac,
        definitionOfDone: dod,
        estimate: est,
      });
      toast.success("Refinado com sucesso!");
      onSaved?.();
    } catch (error) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PremiumTextArea
        label="Refinamento funcional"
        value={fr}
        onChange={setFr}
        placeholder="Descreva o refinamento funcional..."
        readOnly={readOnly}
      />
      <PremiumTextArea
        label="Refinamento técnico"
        value={tr}
        onChange={setTr}
        placeholder="Descreva o refinamento técnico..."
        readOnly={readOnly}
      />
      <PremiumTextArea
        label="Critérios de aceite"
        value={ac}
        onChange={setAc}
        placeholder="Liste os critérios de aceite..."
        readOnly={readOnly}
      />
      <PremiumTextArea
        label="Definição de pronto (DoD)"
        value={dod}
        onChange={setDod}
        placeholder="Defina quando estará pronto..."
        readOnly={readOnly}
      />

      <div className="space-y-2">
        <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">
          Estimativa (horas)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FIBONACCI.map((v) => (
            <motion.button
              key={v}
              type="button"
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

      {item.phase === "refinement" && !readOnly && (
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-gradient-to-r from-primary to-[hsl(262_83%_58%)] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Refinando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Salvar e Refinar
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
