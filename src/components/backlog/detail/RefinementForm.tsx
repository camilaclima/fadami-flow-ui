import { useState } from "react";
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

export function RefinementForm({ item, onSaved, readOnly }: Props) {
  const { saveRefinement } = useBacklogStore();
  const [fr, setFr] = useState(item.refinement?.functionalRefinement ?? "");
  const [tr, setTr] = useState(item.refinement?.technicalRefinement ?? "");
  const [ac, setAc] = useState(item.refinement?.acceptanceCriteria ?? "");
  const [dod, setDod] = useState(item.refinement?.definitionOfDone ?? "");
  const [est, setEst] = useState(item.refinement?.estimate ?? 8);
  const [saving, setSaving] = useState(false);

  const TextArea = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        rows={2}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none transition-shadow border-0"
      />
    </div>
  );

  const handleSave = async () => {
    if (!fr || !tr || !ac || !dod) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    saveRefinement(item.id, { functionalRefinement: fr, technicalRefinement: tr, acceptanceCriteria: ac, definitionOfDone: dod, estimate: est });
    toast.success("Refinado com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <TextArea label="Refinamento funcional" value={fr} onChange={setFr} placeholder="Descreva o refinamento funcional..." />
      <TextArea label="Refinamento técnico" value={tr} onChange={setTr} placeholder="Descreva o refinamento técnico..." />
      <TextArea label="Critérios de aceite" value={ac} onChange={setAc} placeholder="Liste os critérios de aceite..." />
      <TextArea label="Definição de pronto (DoD)" value={dod} onChange={setDod} placeholder="Defina quando estará pronto..." />

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

      {item.phase === "refinement" && !readOnly && (
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
              Refinando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvar e Refinar
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
