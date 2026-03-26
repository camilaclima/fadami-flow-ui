import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
import { ThermoBadge, PriorityBadge, PhaseBadge } from "./Badges";
import { ProgressBar } from "./detail/ProgressBar";
import { HistoryTimeline } from "./detail/HistoryTimeline";
import { PrioritizationForm } from "./detail/PrioritizationForm";
import { ApprovalForm } from "./detail/ApprovalForm";
import { RefinementForm } from "./detail/RefinementForm";
import {
  User,
  Calendar,
  Package,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  Settings2,
  CheckSquare,
  Wrench,
  LayoutList,
  CalendarCheck,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  item: BacklogItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PHASE_ICONS: Record<Phase, React.ReactNode> = {
  backlog: <LayoutList className="w-3.5 h-3.5" />,
  prioritization: <Settings2 className="w-3.5 h-3.5" />,
  approval: <CheckSquare className="w-3.5 h-3.5" />,
  refinement: <Wrench className="w-3.5 h-3.5" />,
  available: <Clock className="w-3.5 h-3.5" />,
  planned: <CalendarCheck className="w-3.5 h-3.5" />,
  finished: <Flag className="w-3.5 h-3.5" />,
};

type TabId = "details" | "history";

function AccordionSection({
  title,
  icon,
  defaultOpen,
  active,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  useEffect(() => {
    if (defaultOpen !== undefined) setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${active ? "ring-1 ring-primary/30" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors ${
          active ? "bg-primary/10 text-primary" : "bg-secondary/30 text-foreground hover:bg-surface-hover"
        }`}
      >
        {icon}
        <span className="text-xs font-semibold flex-1 text-left">{title}</span>
        {active && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-md">
            Atual
          </span>
        )}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="text-sm text-foreground mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients, backlogs } = useBacklogStore();
  const [activeTab, setActiveTab] = useState<TabId>("details");

  // Get the live version of the item from the store
  const liveItem = item ? backlogs.find((b) => b.id === item.id) ?? item : null;

  // Reset tab when opening
  useEffect(() => {
    if (open) setActiveTab("details");
  }, [open]);

  if (!liveItem) return null;

  const product = products.find((p) => p.id === liveItem.productId);
  const client = liveItem.clientId ? clients.find((c) => c.id === liveItem.clientId) : null;
  const phaseIdx = PHASES.indexOf(liveItem.phase);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Detalhes", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "history", label: "Histórico", icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 bg-card border-border max-h-[88vh] overflow-hidden gap-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight truncate">{liveItem.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <PhaseBadge value={liveItem.phase} />
                <ThermoBadge value={liveItem.thermometer} />
                {liveItem.prioritization && <PriorityBadge value={liveItem.prioritization.priority} />}
              </div>
            </div>
          </div>
          <ProgressBar currentPhase={liveItem.phase} />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="detail-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(88vh - 180px)" }}>
          <AnimatePresence mode="wait">
            {activeTab === "details" ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border"
              >
                {/* LEFT — Reference Panel */}
                <div className="md:col-span-2 p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Descrição</span>
                    <p className="text-sm text-foreground leading-relaxed">{liveItem.description}</p>
                  </div>

                  <div className="border-t border-border pt-3 space-y-0">
                    <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Criado por" value={liveItem.createdBy} />
                    <InfoRow
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      label="Data de criação"
                      value={new Date(liveItem.createdAt).toLocaleDateString("pt-BR")}
                    />
                    <InfoRow icon={<Package className="w-3.5 h-3.5" />} label="Produto" value={
                      <span className="flex items-center gap-1.5">
                        {product && <span className="w-2 h-2 rounded-full" style={{ background: product.color }} />}
                        {product?.name ?? "—"}
                      </span>
                    } />
                    <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Cliente" value={client?.name ?? "—"} />
                  </div>

                  {/* Quick summary of completed data */}
                  {liveItem.prioritization && phaseIdx > 1 && (
                    <div className="border-t border-border pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Resumo da Priorização</span>
                      <div className="flex gap-3 mt-2 text-xs text-foreground">
                        <span>Valor: <strong>{liveItem.prioritization.businessValue}</strong></span>
                        <span>Custo: <strong>{liveItem.prioritization.opportunityCost}</strong></span>
                        <span>Est: <strong>{liveItem.prioritization.estimate}h</strong></span>
                      </div>
                    </div>
                  )}

                  {liveItem.approval && phaseIdx > 2 && (
                    <div className="border-t border-border pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Observação da Aprovação</span>
                      <p className="text-xs text-foreground mt-1">{liveItem.approval.observation || "—"}</p>
                    </div>
                  )}
                </div>

                {/* RIGHT — Action Panel */}
                <div className="md:col-span-3 p-5 space-y-3">
                  <PhaseActionPanel item={liveItem} phaseIdx={phaseIdx} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhaseActionPanel({ item, phaseIdx }: { item: BacklogItem; phaseIdx: number }) {
  // Continuous flow: after saving, the store updates the item phase, and we re-render the next phase form
  const handleSaved = () => {
    // No-op — the store updates the item and we re-render automatically via liveItem
  };

  return (
    <div className="space-y-3">
      {/* Current phase gets active styling, past phases are collapsed accordions */}
      {phaseIdx >= 1 && (
        <AccordionSection
          title="Priorização"
          icon={PHASE_ICONS.prioritization}
          defaultOpen={item.phase === "prioritization"}
          active={item.phase === "prioritization"}
        >
          <PrioritizationForm item={item} onSaved={handleSaved} readOnly={item.phase !== "prioritization"} />
        </AccordionSection>
      )}

      {phaseIdx >= 2 && (
        <AccordionSection
          title="Aprovação"
          icon={PHASE_ICONS.approval}
          defaultOpen={item.phase === "approval"}
          active={item.phase === "approval"}
        >
          <ApprovalForm item={item} onSaved={handleSaved} readOnly={item.phase !== "approval"} />
        </AccordionSection>
      )}

      {phaseIdx >= 3 && (
        <AccordionSection
          title="Refinamento"
          icon={PHASE_ICONS.refinement}
          defaultOpen={item.phase === "refinement"}
          active={item.phase === "refinement"}
        >
          <RefinementForm item={item} onSaved={handleSaved} readOnly={item.phase !== "refinement"} />
        </AccordionSection>
      )}

      {(item.phase === "available" || item.phase === "planned" || item.phase === "finished") && (
        <AccordionSection
          title={PHASE_LABELS[item.phase]}
          icon={PHASE_ICONS[item.phase]}
          defaultOpen
          active
        >
          <p className="text-xs text-muted-foreground">Placeholder para feature futura.</p>
        </AccordionSection>
      )}

      {phaseIdx === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Este backlog está na fila inicial. Mova para Priorização para começar.</p>
        </div>
      )}
    </div>
  );
}
