import { useState } from "react";
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

export function ApprovalForm({ item, onSaved, readOnly }: Props) {
  const { saveApproval } = useBacklogStore();
  const [obs, setObs] = useState(item.approval?.observation ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    saveApproval(item.id, { observation: obs });
    toast.success("Aprovado com sucesso!");
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Observação</span>
        <textarea
          value={obs}
          onChange={(e) => !readOnly && setObs(e.target.value)}
          readOnly={readOnly}
          rows={4}
          placeholder="Adicione uma observação sobre a aprovação..."
          className="w-full px-4 py-3 rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none transition-shadow border-0"
        />
      </div>

      {item.phase === "approval" && !readOnly && (
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
              Aprovando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvar e Aprovar
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
