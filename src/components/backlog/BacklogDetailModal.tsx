import { useState, useEffect, memo, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase, Priority } from "@/types/backlog";
import { PHASES } from "@/types/backlog";
import { ThermoBadge, PriorityBadge, PhaseBadge } from "./Badges";
import { HistoryTimeline } from "./detail/HistoryTimeline";
import { PhaseTimeline } from "./detail/PhaseTimeline";

import { PrioritizationForm } from "./detail/PrioritizationForm";
import { ApprovalForm } from "./detail/ApprovalForm";
import { RefinementForm } from "./detail/RefinementForm";

import {
  User,
  Calendar,
  Package,
  Building2,
  ChevronDown,
  FileText,
  Clock,
  Settings2,
  CheckCircle,
  Wrench,
  CalendarCheck,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- INTERFACES ---
interface Props {
  item: BacklogItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// --- COMPONENTES EXTRAÍDOS ---

const PHASE_ICONS: Record<Phase, React.ReactNode> = {
  prioritization: <Settings2 className="w-3.5 h-3.5" />,
  approval: <CheckCircle className="w-3.5 h-3.5" />,
  refinement: <Wrench className="w-3.5 h-3.5" />,
  available: <Clock className="w-3.5 h-3.5" />,
  planned: <CalendarCheck className="w-3.5 h-3.5" />,
  finished: <Flag className="w-3.5 h-3.5" />,
};

const PhaseAccordion = memo(
  ({
    title,
    icon,
    defaultOpen,
    active,
    completed,
    children,
    updatedBy,
    updatedAt,
  }: {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    active?: boolean;
    completed?: boolean;
    children: React.ReactNode;
    updatedBy?: string;
    updatedAt?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

    useEffect(() => {
      if (defaultOpen !== undefined) setIsOpen(defaultOpen);
    }, [defaultOpen]);

    const showStamp = completed && (updatedBy || updatedAt);

    return (
      <div className="group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-2.5 py-4 transition-colors ${
            active ? "text-primary" : completed ? "text-foreground/70" : "text-foreground hover:text-primary"
          }`}
        >
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors shrink-0 ${
              active ? "bg-primary/15" : completed ? "bg-phase-finished/10" : "bg-secondary"
            }`}
          >
            {completed ? <CheckCircle className="w-3 h-3 text-phase-finished" /> : icon}
          </div>

          <div className="flex flex-1 items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold tracking-wide uppercase truncate">{title}</span>
              {active && (
                <span className="text-[8px] font-bold uppercase tracking-widest bg-primary/15 text-primary px-2 py-0.5 rounded-md shrink-0">
                  Atual
                </span>
              )}
            </div>
            {showStamp && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80 shrink-0 ml-4">
                <span className="max-w-[100px] truncate">{updatedBy}</span>
                {updatedBy && updatedAt && <span className="opacity-40">•</span>}
                <span>{updatedAt}</span>
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && <div className="pb-5 pl-8">{children}</div>}
        <div className="h-px bg-border/40" />
      </div>
    );
  },
);

// Componente isolado para evitar re-renders do painel inteiro
const PhaseActionPanel = memo(
  ({ item, phaseIdx }: { item: BacklogItem; phaseIdx: number }) => {
    const formatDate = (dateString?: string) => {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date.toLocaleDateString("pt-BR");
    };

    return (
      <div className="space-y-0">
        {phaseIdx >= 0 && (
          <PhaseAccordion
            title="Priorização"
            icon={PHASE_ICONS.prioritization}
            defaultOpen={item.phase === "prioritization"}
            active={item.phase === "prioritization"}
            completed={phaseIdx > 0}
            updatedBy={(item.prioritization as any)?.updatedBy || item.createdBy}
            updatedAt={formatDate((item.prioritization as any)?.updatedAt || item.createdAt)}
          >
            <PrioritizationForm item={item} onSaved={() => {}} readOnly={item.phase !== "prioritization"} />
          </PhaseAccordion>
        )}

        {phaseIdx >= 1 && (
          <PhaseAccordion
            title="Aprovação"
            icon={PHASE_ICONS.approval}
            defaultOpen={item.phase === "approval"}
            active={item.phase === "approval"}
            completed={phaseIdx > 1}
            updatedBy={(item.approval as any)?.updatedBy || item.createdBy}
            updatedAt={formatDate((item.approval as any)?.updatedAt || item.createdAt)}
          >
            <ApprovalForm item={item} onSaved={() => {}} readOnly={item.phase !== "approval"} />
          </PhaseAccordion>
        )}

        {phaseIdx >= 2 && (
          <PhaseAccordion
            title="Refinamento"
            icon={PHASE_ICONS.refinement}
            defaultOpen={item.phase === "refinement"}
            active={item.phase === "refinement"}
            completed={phaseIdx > 2}
            updatedBy={(item.refinement as any)?.updatedBy || item.createdBy}
            updatedAt={formatDate((item.refinement as any)?.updatedAt || item.createdAt)}
          >
            <RefinementForm item={item} onSaved={() => {}} readOnly={item.phase !== "refinement"} />
          </PhaseAccordion>
        )}
      </div>
    );
  },
  (prev, next) => {
    // SÓ RE-RENDERIZA SE A FASE MUDAR OU SE O ID DO ITEM MUDAR
    // Isso impede que digitação nos inputs (que muda o conteúdo do item) mate o foco
    return prev.item.phase === next.item.phase && prev.item.id === next.item.id;
  },
);

// --- COMPONENTE PRINCIPAL ---

export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients, backlogs } = useBacklogStore();
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  // Buscamos o item uma única vez ao abrir
  const liveItem = useMemo(() => {
    if (!item) return null;
    return backlogs.find((b) => b.id === item.id) ?? item;
  }, [item?.id, open]); // Só recalcula se o ID mudar ou se fechar/abrir

  if (!liveItem) return null;

  const product = products.find((p) => p.id === liveItem.productId);
  const client = liveItem.clientId ? clients.find((c) => c.id === liveItem.clientId) : null;
  const phaseIdx = PHASES.indexOf(liveItem.phase);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden border-border/50 shadow-2xl bg-card max-h-[88vh]">
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <PhaseTimeline currentPhase={liveItem.phase} />
        </div>

        <div className="flex flex-col md:flex-row h-[640px]">
          <div className="md:w-[40%] shrink-0 flex flex-col border-r border-border/30 bg-surface/60 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-bold text-foreground truncate">{liveItem.title}</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <PhaseBadge value={liveItem.phase} />
                <ThermoBadge value={liveItem.thermometer} />
                {liveItem.prioritization && <PriorityBadge value={liveItem.prioritization.priority} />}
              </div>
            </div>

            <div className="flex-1 px-5 py-4 overflow-y-auto">
              {activeTab === "details" ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-foreground/90">{liveItem.description}</p>
                  <div className="pt-4 border-t border-border/20">
                    <div className="text-[11px] text-muted-foreground mb-1">PRODUTO</div>
                    <div className="text-sm font-medium">{product?.name ?? "—"}</div>
                  </div>
                </div>
              ) : (
                <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
              )}
            </div>
          </div>

          <div className="md:w-[60%] flex-1 overflow-y-auto px-5 pt-0 pb-5">
            <PhaseActionPanel item={liveItem} phaseIdx={phaseIdx} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
