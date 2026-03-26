import { useState, useEffect, memo, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase } from "@/types/backlog";
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
  AlertCircle,
  BarChart3,
  Thermometer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  item: BacklogItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PHASE_ICONS: Record<Phase, React.ReactNode> = {
  prioritization: <Settings2 className="w-3.5 h-3.5" />,
  approval: <CheckCircle className="w-3.5 h-3.5" />,
  refinement: <Wrench className="w-3.5 h-3.5" />,
  available: <Clock className="w-3.5 h-3.5" />,
  planned: <CalendarCheck className="w-3.5 h-3.5" />,
  finished: <Flag className="w-3.5 h-3.5" />,
};

// --- COMPONENTES AUXILIARES ESTÁTICOS (PARA NÃO PERDER O FOCO) ---

const MetaItem = memo(
  ({
    icon,
    label,
    children,
    highlight = false,
  }: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    highlight?: boolean;
  }) => (
    <div
      className={`flex items-center gap-3 py-2 ${highlight ? "bg-primary/5 p-3 rounded-xl border border-primary/10 mt-2" : ""}`}
    >
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${highlight ? "bg-primary/20 text-primary" : "bg-secondary/80 text-muted-foreground"}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest font-bold">{label}</span>
        <div
          className={`text-[13px] text-foreground font-medium mt-0.5 truncate ${highlight ? "text-sm scale-105 origin-left" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  ),
);

const PhaseAccordion = memo(({ title, icon, defaultOpen, active, completed, children, updatedBy, updatedAt }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  useEffect(() => {
    if (defaultOpen !== undefined) setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="group border-b border-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2.5 py-4 transition-colors ${active ? "text-primary" : "text-foreground hover:text-primary"}`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${active ? "bg-primary/15" : completed ? "bg-phase-finished/10" : "bg-secondary"}`}
        >
          {completed ? <CheckCircle className="w-3 h-3 text-phase-finished" /> : icon}
        </div>
        <div className="flex-1 text-left flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
          {(updatedBy || updatedAt) && completed && (
            <span className="text-[10px] text-muted-foreground/60 mr-2">
              {updatedBy} • {updatedAt}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="pb-5 pl-8">{children}</div>}
    </div>
  );
});

// --- COMPONENTE PRINCIPAL ---

export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients, backlogs } = useBacklogStore();
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  const liveItem = useMemo(() => {
    if (!item) return null;
    return backlogs.find((b) => b.id === item.id) ?? item;
  }, [item?.id, open, backlogs]);

  if (!liveItem) return null;

  const product = products.find((p) => p.id === liveItem.productId);
  const client = liveItem.clientId ? clients.find((c) => c.id === liveItem.clientId) : null;
  const phaseIdx = PHASES.indexOf(liveItem.phase);

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date.toLocaleDateString("pt-BR");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden border-border/50 shadow-2xl bg-card max-h-[88vh]">
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <PhaseTimeline currentPhase={liveItem.phase} />
        </div>

        <div className="flex flex-col md:flex-row h-[640px]">
          {/* LADO ESQUERDO: INFORMAÇÕES */}
          <div className="md:w-[40%] shrink-0 flex flex-col border-r border-border/30 bg-surface/60 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-bold text-foreground truncate">{liveItem.title}</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <PhaseBadge value={liveItem.phase} />
                <ThermoBadge value={liveItem.thermometer} />
                {liveItem.prioritization && <PriorityBadge value={liveItem.prioritization.priority} />}
              </div>
            </div>

            <div className="flex gap-0 px-5 border-b border-border/40">
              {(["details", "history"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-3 py-2 text-xs font-semibold relative ${activeTab === id ? "text-primary" : "text-muted-foreground"}`}
                >
                  {id === "details" ? "Detalhes" : "Histórico"}
                  {activeTab === id && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 px-5 py-4 overflow-y-auto">
              {activeTab === "details" ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{liveItem.description}</p>

                  <div className="space-y-0.5 pt-2">
                    <MetaItem
                      icon={<User className="w-3.5 h-3.5" />}
                      label="Responsável"
                      children={liveItem.createdBy}
                    />
                    <MetaItem
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      label="Criado em"
                      children={formatDate(liveItem.createdAt)}
                    />
                    <MetaItem
                      icon={<Package className="w-3.5 h-3.5" />}
                      label="Produto"
                      children={product?.name ?? "—"}
                    />
                    <MetaItem
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      label="Cliente"
                      children={client?.name ?? "—"}
                    />

                    {/* RESTAURANDO PRIORIDADE CALCULADA E TERMÔMETRO */}
                    <div className="mt-4 pt-4 border-t border-border/20 space-y-3">
                      <MetaItem icon={<BarChart3 className="w-3.5 h-3.5" />} label="Prioridade Calculada">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">
                            {liveItem.prioritization?.calculatedPriority ?? 0}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                            Score Final
                          </span>
                        </div>
                      </MetaItem>

                      <MetaItem icon={<AlertCircle className="w-4 h-4" />} label="Business Priority" highlight>
                        <PriorityBadge value={liveItem.prioritization?.priority ?? "Pendente"} />
                      </MetaItem>
                    </div>
                  </div>
                </div>
              ) : (
                <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
              )}
            </div>
          </div>

          {/* LADO DIREITO: FORMULÁRIOS */}
          <div className="md:w-[60%] flex-1 overflow-y-auto px-5 pt-0 pb-5">
            <PhaseAccordion
              title="Priorização"
              icon={PHASE_ICONS.prioritization}
              defaultOpen={liveItem.phase === "prioritization"}
              active={liveItem.phase === "prioritization"}
              completed={phaseIdx > 0}
              updatedBy={liveItem.prioritization?.updatedBy}
              updatedAt={formatDate(liveItem.prioritization?.updatedAt)}
            >
              <PrioritizationForm
                key={`form-prior-${liveItem.id}`}
                item={liveItem}
                readOnly={liveItem.phase !== "prioritization"}
              />
            </PhaseAccordion>

            {phaseIdx >= 1 && (
              <PhaseAccordion
                title="Aprovação"
                icon={PHASE_ICONS.approval}
                defaultOpen={liveItem.phase === "approval"}
                active={liveItem.phase === "approval"}
                completed={phaseIdx > 1}
              >
                <ApprovalForm
                  key={`form-appr-${liveItem.id}`}
                  item={liveItem}
                  readOnly={liveItem.phase !== "approval"}
                />
              </PhaseAccordion>
            )}

            {phaseIdx >= 2 && (
              <PhaseAccordion
                title="Refinamento"
                icon={PHASE_ICONS.refinement}
                defaultOpen={liveItem.phase === "refinement"}
                active={liveItem.phase === "refinement"}
                completed={phaseIdx > 2}
              >
                <RefinementForm
                  key={`form-refi-${liveItem.id}`}
                  item={liveItem}
                  readOnly={liveItem.phase !== "refinement"}
                />
              </PhaseAccordion>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
