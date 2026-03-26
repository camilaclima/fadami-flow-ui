import { useState, useEffect, memo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase, Priority } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
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

type TabId = "details" | "history";

function PhaseAccordion({
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
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  useEffect(() => {
    if (defaultOpen !== undefined) setIsOpen(defaultOpen);
  }, [defaultOpen]);

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
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[8px] font-bold uppercase tracking-widest bg-primary/15 text-primary px-2 py-0.5 rounded-md shrink-0"
              >
                Atual
              </motion.span>
            )}
          </div>

          {(updatedBy || updatedAt) && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80 shrink-0 ml-4">
              <span className="max-w-[100px] truncate">{updatedBy}</span>
              {updatedBy && updatedAt && <span className="opacity-40">•</span>}
              <span>{updatedAt}</span>
            </div>
          )}
        </div>

        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-2 shrink-0">
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-px bg-border/40" />
    </div>
  );
}

function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest font-semibold">{label}</span>
        <div className="text-[13px] text-foreground font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function PriorityResultCard({ item }: { item: BacklogItem }) {
  if (!item.prioritization) return null;
  const { businessValue: bv, opportunityCost: oc, estimate: est } = item.prioritization;
  // @ts-ignore
  const urg = item.prioritization.urgency ?? 0;
  const score = est > 0 ? (bv + oc + urg) / est : 0;
  const totalValue = bv + oc + urg;

  const getPriority = (): Priority | "none" => {
    if (est === 0 || (bv === 0 && oc === 0 && urg === 0)) return "none";
    if (score >= 0.6 && totalValue >= 4) return "high";
    if (score >= 0.26) return "medium";
    return "low";
  };

  const priority = getPriority();
  const meta: Record<string, { label: string; color: string; bg: string; border: string }> = {
    high: { label: "Alta", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
    medium: { label: "Média", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    low: { label: "Baixa", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    none: { label: "Pendente", color: "text-muted-foreground", bg: "bg-secondary/50", border: "border-border" },
  };
  const m = meta[priority];

  return (
    <div className="pt-5 border-t border-border/30">
      <div className={`flex items-center justify-between p-3.5 rounded-xl border ${m.border} ${m.bg} transition-all`}>
        <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/80">Prioridade</span>
        <span className={`text-[13px] font-bold uppercase tracking-tight ${m.color}`}>{m.label}</span>
      </div>
    </div>
  );
}

const PhaseActionPanel = memo(({ item, phaseIdx }: { item: BacklogItem; phaseIdx: number }) => {
  const handleSaved = () => {};

  // Funções auxiliares para formatar data com segurança
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
          <PrioritizationForm item={item} onSaved={handleSaved} readOnly={item.phase !== "prioritization"} />
        </PhaseAccordion>
      )}

      {phaseIdx >= 1 && (
        <PhaseAccordion
          title="Aprovação"
          icon={PHASE_ICONS.approval}
          defaultOpen={item.phase === "approval"}
          active={item.phase === "approval"}
          completed={phaseIdx > 1}
          // Caso updatedBy da aprovação não exista, ele tenta pegar do histórico ou criador
          updatedBy={(item.approval as any)?.updatedBy || item.createdBy}
          updatedAt={formatDate((item.approval as any)?.updatedAt || item.createdAt)}
        >
          <ApprovalForm item={item} onSaved={handleSaved} readOnly={item.phase !== "approval"} />
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
          <RefinementForm item={item} onSaved={handleSaved} readOnly={item.phase !== "refinement"} />
        </PhaseAccordion>
      )}
    </div>
  );
});

export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients, backlogs } = useBacklogStore();
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const liveItem = item ? (backlogs.find((b) => b.id === item.id) ?? item) : null;

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
      <DialogContent
        className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden border-border/50 shadow-2xl"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 25px 60px -12px hsl(0 0% 0% / 0.35), 0 0 0 1px hsl(var(--border) / 0.4)",
          maxHeight: "88vh",
        }}
      >
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <PhaseTimeline currentPhase={liveItem.phase} />
        </div>

        <div className="flex flex-col md:flex-row" style={{ height: "calc(88vh - 100px)", maxHeight: "640px" }}>
          <div
            className="md:w-[40%] shrink-0 flex flex-col overflow-hidden border-r border-border/30"
            style={{ background: "hsl(var(--surface) / 0.6)", backdropFilter: "blur(12px)" }}
          >
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-bold text-foreground leading-tight tracking-tight">{liveItem.title}</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <PhaseBadge value={liveItem.phase} />
                <ThermoBadge value={liveItem.thermometer} />
                {liveItem.prioritization && <PriorityBadge value={liveItem.prioritization.priority} />}
              </div>
            </div>

            <div className="flex gap-0 px-5 border-b border-border/40">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors relative ${
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="detail-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.4))" }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className={`flex-1 px-5 py-4 ${activeTab === "history" ? "overflow-y-auto" : "overflow-hidden"}`}>
              <AnimatePresence mode="wait">
                {activeTab === "details" ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div>
                      <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest font-bold">
                        Descrição
                      </span>
                      <p className="text-[13px] text-foreground/90 leading-relaxed mt-1.5">{liveItem.description}</p>
                    </div>
                    <div className="space-y-0">
                      <MetaItem icon={<User className="w-3.5 h-3.5" />} label="Criado por">
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {liveItem.createdBy[0]}
                          </span>
                          {liveItem.createdBy}
                        </span>
                      </MetaItem>
                      <MetaItem icon={<Calendar className="w-3.5 h-3.5" />} label="Data">
                        {new Date(liveItem.createdAt).toLocaleDateString("pt-BR")}
                      </MetaItem>
                      <MetaItem icon={<Package className="w-3.5 h-3.5" />} label="Produto">
                        <span className="flex items-center gap-1.5">
                          {product && <span className="w-2 h-2 rounded-full" style={{ background: product.color }} />}
                          {product?.name ?? "—"}
                        </span>
                      </MetaItem>
                      <MetaItem icon={<Building2 className="w-3.5 h-3.5" />} label="Cliente">
                        {client?.name ?? "—"}
                      </MetaItem>
                    </div>
                    <PriorityResultCard item={liveItem} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
                  </motion.div>
                )}
              </AnimatePresence>
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
