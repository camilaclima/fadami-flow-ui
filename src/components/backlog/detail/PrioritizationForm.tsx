import { useState, useEffect } from "react";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem } from "@/types/backlog";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: BacklogItem;
  onSaved?: () => void;
  readOnly?: boolean;
}

const SCALE = [1, 2, 3, 4, 5];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

function ScaleSelector({
  label,
  guide,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  guide: string;
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <span className="text-[11px] text-foreground/60 uppercase tracking-widest font-semibold">{label}</span>
        <p className="text-[10px] truncate text-[#bbc0c3]">{guide}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCALE.map((v) => (
          <motion.button
            key={v}
            type="button"
            onClick={() => !readOnly && onChange(v)}
            whileHover={!readOnly ? { scale: 1.08 } : {}}
            whileTap={!readOnly ? { scale: 0.95 } : {}}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              v === value
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                : "bg-secondary/60 text-foreground/60 hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {v}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function PrioritizationForm({ item, onSaved, readOnly }: Props) {
  const { savePrioritization } = useBacklogStore();

  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 3);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 3);
  const [est, setEst] = useState(item.prioritization?.estimate ?? 8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBv(item.prioritization?.businessValue ?? 3);
    setOc(item.prioritization?.opportunityCost ?? 3);
    setEst(item.prioritization?.estimate ?? 8);
  }, [item.id]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    savePrioritization(item.id, {
      businessValue: bv,
      opportunityCost: oc,
      estimate: est,
    });

    toast.success("Priorizado com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-5">
      <ScaleSelector
        label="Valor de negócio"
        guide="Impacto para o negócio (1=baixo, 5=alto)"
        value={bv}
        onChange={setBv}
        readOnly={readOnly}
      />
      <ScaleSelector
        label="Custo de oportunidade"
        guide="Custo de não fazer (1=baixo, 5=alto)"
        value={oc}
        onChange={setOc}
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

      {item.phase === "prioritization" && !readOnly && (
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
              <Loader2 className="w-4 h-4 animate-spin" /> Priorizando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Salvar e Priorizar
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
