import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { BacklogItem, Phase } from "@/types/backlog";
import { PHASES, PHASE_LABELS } from "@/types/backlog";
import { ThermoBadge, PriorityBadge, PhaseBadge } from "./Badges";
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

/* ── Accordion for phase sections ── */
function PhaseAccordion({
  title,
  icon,
  defaultOpen,
  active,
  completed,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
  completed?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  useEffect(() => {
    if (defaultOpen !== undefined) setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2.5 py-3 transition-colors ${
          active
            ? "text-primary"
            : completed
            ? "text-foreground/60"
            : "text-foreground hover:text-primary"
        }`}
      >
        <div className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${
          active
            ? "bg-primary/15"
            : completed
            ? "bg-phase-finished/10"
            : "bg-secondary"
        }`}>
          {completed ? <CheckCircle className="w-3 h-3 text-phase-finished" /> : icon}
        </div>
        <span className="text-xs font-semibold flex-1 text-left tracking-wide uppercase">{title}</span>
        {active && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[8px] font-bold uppercase tracking-widest bg-primary/15 text-primary px-2 py-0.5 rounded-md"
          >
            Atual
          </motion.span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
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

      {/* Separator line */}
      <div className="h-px bg-border/40" />
    </div>
  );
}

/* ── Left column info item ── */
function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</span>
        <div className="text-[13px] text-foreground mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/* ── Progress bar (2px, gradient, glow tip) ── */
function ThinProgressBar({ phase }: { phase: Phase }) {
  const idx = PHASES.indexOf(phase);
  const pct = ((idx + 1) / PHASES.length) * 100;

  return (
    <div className="relative w-full h-[2px] bg-border/30 rounded-full overflow-visible">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--phase-finished)))" }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* Glow tip */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
        style={{ boxShadow: "0 0 8px 2px hsl(var(--primary) / 0.5)" }}
        initial={{ left: 0 }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

/* ── Main Modal ── */
export function BacklogDetailModal({ item, open, onOpenChange }: Props) {
  const { products, clients, backlogs } = useBacklogStore();
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const liveItem = item ? backlogs.find((b) => b.id === item.id) ?? item : null;

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
        className="sm:max-w-[960px] p-0 gap-0 overflow-hidden border-border/40"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 25px 80px -12px hsl(var(--primary) / 0.12), 0 8px 32px -8px hsl(0 0% 0% / 0.3), 0 0 0 1px hsl(var(--border) / 0.3)",
          maxHeight: "88vh",
        }}
      >
        {/* ── Top progress bar ── */}
        <div className="px-6 pt-4">
          <ThinProgressBar phase={liveItem.phase} />
        </div>

        {/* ── Header ── */}
        <div className="px-6 pt-4 pb-3">
          <h2 className="text-lg font-bold text-foreground leading-tight tracking-tight">{liveItem.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <PhaseBadge value={liveItem.phase} />
            <ThermoBadge value={liveItem.thermometer} />
            {liveItem.prioritization && <PriorityBadge value={liveItem.prioritization.priority} />}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-0 px-6 border-b border-border/40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
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

        {/* ── Content ── */}
        <AnimatePresence mode="wait">
          {activeTab === "details" ? (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col md:flex-row"
              style={{ height: "calc(88vh - 160px)", maxHeight: "600px" }}
            >
              {/* ═══ LEFT — Reference (40%) ═══ */}
              <div
                className="md:w-[40%] shrink-0 p-6 space-y-5 overflow-hidden border-r border-border/30"
                style={{ background: "hsl(var(--surface) / 0.6)", backdropFilter: "blur(12px)" }}
              >
                {/* Description */}
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Descrição</span>
                  <p className="text-[13px] text-foreground/90 leading-relaxed mt-2">{liveItem.description}</p>
                </div>

                {/* Meta grid */}
                <div className="space-y-0.5">
                  <MetaItem icon={<User className="w-3.5 h-3.5" />} label="Criado por">
                    {liveItem.createdBy}
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

                {/* Completed phase summaries */}
                {liveItem.prioritization && phaseIdx > 1 && (
                  <div className="pt-3 border-t border-border/30">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Priorização</span>
                    <div className="flex gap-4 mt-2">
                      {[
                        { label: "Valor", value: liveItem.prioritization.businessValue },
                        { label: "Custo", value: liveItem.prioritization.opportunityCost },
                        { label: "Est.", value: `${liveItem.prioritization.estimate}h` },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div className="text-lg font-bold text-foreground">{s.value}</div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {liveItem.approval && phaseIdx > 2 && (
                  <div className="pt-3 border-t border-border/30">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Aprovação</span>
                    <p className="text-xs text-foreground/80 mt-1.5 italic leading-relaxed">"{liveItem.approval.observation || "—"}"</p>
                  </div>
                )}
              </div>

              {/* ═══ RIGHT — Action (60%) ═══ */}
              <div
                className="md:w-[60%] flex-1 overflow-y-auto p-6"
                style={{ scrollBehavior: "smooth" }}
              >
                <PhaseActionPanel item={liveItem} phaseIdx={phaseIdx} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="p-6 overflow-y-auto"
              style={{ height: "calc(88vh - 160px)", maxHeight: "600px", scrollBehavior: "smooth" }}
            >
              <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Phase Action Panel (right column) ── */
function PhaseActionPanel({ item, phaseIdx }: { item: BacklogItem; phaseIdx: number }) {
  const handleSaved = () => {};

  return (
    <div>
      {phaseIdx >= 0 && (
        <PhaseAccordion
          title="Priorização"
          icon={PHASE_ICONS.prioritization}
          defaultOpen={item.phase === "prioritization"}
          active={item.phase === "prioritization"}
          completed={phaseIdx > 0}
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
        >
          <RefinementForm item={item} onSaved={handleSaved} readOnly={item.phase !== "refinement"} />
        </PhaseAccordion>
      )}

      {(item.phase === "available" || item.phase === "planned" || item.phase === "finished") && (
        <PhaseAccordion
          title={PHASE_LABELS[item.phase]}
          icon={PHASE_ICONS[item.phase]}
          defaultOpen
          active
        >
          <p className="text-xs text-muted-foreground">Placeholder para feature futura.</p>
        </PhaseAccordion>
      )}
    </div>
  );
}
