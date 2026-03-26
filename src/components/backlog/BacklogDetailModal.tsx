import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
import { ThermoBadge, PriorityBadge, PhaseBadge } from "./Badges";
import { Check, Circle, Clock, ChevronDown, ChevronRight, User, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  item: BacklogItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function PhaseTimeline({ item }: { item: BacklogItem }) {
  const currentIdx = PHASES.indexOf(item.phase);
  return (
    <div className="flex items-center gap-1 py-4 overflow-x-auto">
      {PHASES.map((phase, i) => {
        const completed = i < currentIdx;
        const active = phase === item.phase;
        const future = i > currentIdx;
        return (
          <div key={phase} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  completed
                    ? "bg-phase-finished text-card"
                    : active
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : active ? <Circle className="w-3 h-3 fill-current" /> : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {PHASE_LABELS[phase]}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={`w-6 h-0.5 mx-0.5 mt-[-14px] ${i < currentIdx ? "bg-phase-finished" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AccordionSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-surface-hover transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function PrioritizationForm({ item }: { item: BacklogItem }) {
  const { savePrioritization } = useBacklogStore();
  const [bv, setBv] = useState(item.prioritization?.businessValue ?? 3);
  const [oc, setOc] = useState(item.prioritization?.opportunityCost ?? 3);
  const [est, setEst] = useState(item.prioritization?.estimate ?? 8);

  const handleSave = () => {
    savePrioritization(item.id, { businessValue: bv, opportunityCost: oc, estimate: est });
    toast.success("Priorizado e movido para Aprovação!");
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Valor de negócio (1-5)</label>
        <input
          type="range" min={1} max={5} value={bv} onChange={(e) => setBv(+e.target.value)}
          className="w-full accent-primary"
        />
        <span className="text-sm font-medium text-foreground">{bv}</span>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Custo de oportunidade (1-5)</label>
        <input
          type="range" min={1} max={5} value={oc} onChange={(e) => setOc(+e.target.value)}
          className="w-full accent-primary"
        />
        <span className="text-sm font-medium text-foreground">{oc}</span>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Estimativa (horas)</label>
        <input
          type="number" min={1} value={est} onChange={(e) => setEst(+e.target.value)}
          className="w-24 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {item.phase === "prioritization" && (
        <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Salvar e Priorizar
        </button>
      )}
    </div>
  );
}

function ApprovalForm({ item }: { item: BacklogItem }) {
  const { saveApproval } = useBacklogStore();
  const [obs, setObs] = useState(item.approval?.observation ?? "");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Observação</label>
        <textarea
          value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>
      {item.phase === "approval" && (
        <button
          onClick={() => { saveApproval(item.id, { observation: obs }); toast.success("Aprovado e movido para Refinamento!"); }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Salvar e Aprovar
        </button>
      )}
    </div>
  );
}

function RefinementForm({ item }: { item: BacklogItem }) {
  const { saveRefinement } = useBacklogStore();
  const [fr, setFr] = useState(item.refinement?.functionalRefinement ?? "");
  const [tr, setTr] = useState(item.refinement?.technicalRefinement ?? "");
  const [ac, setAc] = useState(item.refinement?.acceptanceCriteria ?? "");
  const [dod, setDod] = useState(item.refinement?.definitionOfDone ?? "");
  const [est, setEst] = useState(item.refinement?.estimate ?? 8);

  const textarea = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {textarea("Refinamento funcional", fr, setFr)}
      {textarea("Refinamento técnico", tr, setTr)}
      {textarea("Critérios de aceite", ac, setAc)}
      {textarea("Definição de pronto (DoD)", dod, setDod)}
      <div>
        <label className="text-xs text-muted-foreground">Estimativa (horas)</label>
        <input
          type="number" min={1} value={est} onChange={(e) => setEst(+e.target.value)}
          className="w-24 px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {item.phase === "refinement" && (
        <button
          onClick={() => {
            if (!fr || !tr || !ac || !dod) { toast.error("Preencha todos os campos."); return; }
            saveRefinement(item.id, { functionalRefinement: fr, technicalRefinement: tr, acceptanceCriteria: ac, definitionOfDone: dod, estimate: est });
            toast.success("Refinado e movido para Disponível!");
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Salvar e Refinar
        </button>
      )}
    </div>
  );
}

export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients } = useBacklogStore();
  if (!item) return null;

  const product = products.find((p) => p.id === item.productId);
  const client = clients.find((c) => c.id === item.clientId);
  const phaseIdx = PHASES.indexOf(item.phase);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Meta info */}
          <div className="flex flex-wrap gap-2 items-center">
            <PhaseBadge value={item.phase} />
            <ThermoBadge value={item.thermometer} />
            {item.prioritization && <PriorityBadge value={item.prioritization.priority} />}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <FieldDisplay label="Criado por" value={<span className="flex items-center gap-1"><User className="w-3 h-3" />{item.createdBy}</span>} />
            <FieldDisplay label="Data" value={<span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>} />
            <FieldDisplay label="Produto" value={product?.name ?? "—"} />
            <FieldDisplay label="Cliente" value={client?.name ?? "—"} />
          </div>

          <FieldDisplay label="Descrição" value={item.description} />

          {/* Timeline */}
          <PhaseTimeline item={item} />

          {/* Phase sections */}
          {phaseIdx >= 1 && (
            <AccordionSection title="⚙️ Priorização" defaultOpen={item.phase === "prioritization"}>
              <PrioritizationForm item={item} />
            </AccordionSection>
          )}

          {phaseIdx >= 2 && (
            <AccordionSection title="✅ Aprovação" defaultOpen={item.phase === "approval"}>
              <ApprovalForm item={item} />
            </AccordionSection>
          )}

          {phaseIdx >= 3 && (
            <AccordionSection title="🔧 Refinamento" defaultOpen={item.phase === "refinement"}>
              <RefinementForm item={item} />
            </AccordionSection>
          )}

          {item.phase === "available" && (
            <AccordionSection title="⏳ Disponível" defaultOpen>
              <p className="text-sm text-muted-foreground">Placeholder para feature futura.</p>
            </AccordionSection>
          )}

          {item.phase === "planned" && (
            <AccordionSection title="📅 Planejado" defaultOpen>
              <p className="text-sm text-muted-foreground">Placeholder para feature futura.</p>
            </AccordionSection>
          )}

          {item.phase === "finished" && (
            <AccordionSection title="🏁 Finalizado" defaultOpen>
              <p className="text-sm text-muted-foreground">Placeholder para feature futura.</p>
            </AccordionSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
