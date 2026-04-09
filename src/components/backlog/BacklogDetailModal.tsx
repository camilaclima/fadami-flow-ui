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
  Clock,
  Settings2,
  CheckCircle,
  Wrench,
  CalendarCheck,
  Flag,
  AlertCircle,
  Paperclip,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- INTERFACES ---
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

// --- COMPONENTES AUXILIARES ---

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
      className={`flex items-center gap-3 py-2 ${
        highlight ? "bg-primary/[0.03] p-3 rounded-xl border border-primary/10 mt-3" : ""
      }`}
    >
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
          highlight ? "bg-primary/20 text-primary" : "bg-secondary/80 text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest font-bold">{label}</span>
        <div className="mt-0.5">
          <div className="text-[13px] text-foreground font-medium truncate">{children}</div>
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
        className={`w-full flex items-center gap-2.5 py-4 transition-colors ${
          active ? "text-primary font-bold" : "text-foreground hover:text-primary"
        }`}
      >
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${active ? "bg-primary/15" : completed ? "bg-emerald-500/10" : "bg-secondary"}`}
        >
          {completed ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : icon}
        </div>

        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide truncate">{title}</span>

          {/* INFO DE QUEM FEZ À DIREITA - AJUSTADO */}
          {completed && (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/40 mr-2">
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {updatedBy || "Sistema"}
              </span>
              <span className="text-[10px] text-muted-foreground/30">•</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {updatedAt || "--/--/--"}
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pb-6 pl-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Casts para acessar propriedades dinâmicas das fases
  const prioData = (liveItem.prioritization || {}) as any;
  const approvalData = (liveItem.approval || {}) as any;
  const refinementData = (liveItem.refinement || {}) as any;

  // Função para buscar nome do perfil se houver join
  const getUserName = (data: any) => {
    if (!data) return null;
    if (data.profiles) {
      const first = data.profiles.first_name || '';
      const last = data.profiles.last_name || '';
      return `${first} ${last}`.trim() || null;
    }
    return data.updatedBy;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date.toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden border-border/50 shadow-2xl bg-card max-h-[88vh]">
        <div className="px-6 pt-5 pb-3 border-b border-border/30">
          <PhaseTimeline currentPhase={liveItem.phase} />
        </div>

        <div className="flex flex-col md:flex-row h-[640px]">
          {/* LADO ESQUERDO: INFOS & STATUS */}
          <div className="md:w-[40%] shrink-0 flex flex-col border-r border-border/30 bg-surface/60 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-bold text-foreground leading-tight">{liveItem.title}</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <PhaseBadge value={liveItem.phase} />
                <ThermoBadge value={liveItem.thermometer} />
                {prioData?.priority && <PriorityBadge value={prioData.priority} />}
              </div>
            </div>

            <div className="flex gap-0 px-5 border-b border-border/40">
              {(["details", "history"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`px-3 py-2 text-xs font-semibold relative transition-colors ${
                    activeTab === id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
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
              <AnimatePresence mode="wait">
                {activeTab === "details" ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest font-bold">
                        Descrição
                      </span>
                      <p className="text-[13px] text-foreground/90 leading-relaxed mt-1.5">{liveItem.description}</p>
                    </div>

                    <div className="space-y-0.5 pt-2">
                      <MetaItem
                        icon={<User className="w-3.5 h-3.5" />}
                        label="Responsável"
                        children={liveItem.createdBy}
                      />
                      <MetaItem
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        label="Data de Criação"
                        children={formatDateTime(liveItem.createdAt)}
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
                      {liveItem.attachment && (
                        <MetaItem
                          icon={<Paperclip className="w-3.5 h-3.5" />}
                          label="Anexo"
                        >
                          <a
                            href={liveItem.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3" />
                            Visualizar / Download
                          </a>
                        </MetaItem>
                      )}

                      <div className="pt-2">
                        <MetaItem
                          icon={<AlertCircle className="w-4 h-4" />}
                          label="Prioridade"
                          highlight={!!prioData?.priority}
                        >
                          {prioData?.priority ? (
                            <PriorityBadge value={prioData.priority} />
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Aguardando priorização</span>
                          )}
                        </物件Item>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <HistoryTimeline history={liveItem.phaseHistory} createdBy={liveItem.createdBy} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* LADO DIREITO: FLUXO DE TRABALHO COM INFOS DE CONCLUSÃO */}
          <div className="md:w-[60%] flex-1 overflow-y-auto px-5 pt-0 pb-5">
            <div className="max-w-xl mx-auto">
              <PhaseAccordion
                title="Priorização"
                icon={PHASE_ICONS.prioritization}
                defaultOpen={liveItem.phase === "prioritization"}
                active={liveItem.phase === "prioritization"}
                completed={phaseIdx > 0}
                updatedBy={getUserName(prioData)}
                updatedAt={formatDate(prioData?.updatedAt)}
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
                  updatedBy={getUserName(approvalData)}
                  updatedAt={formatDate(approvalData?.updatedAt)}
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
                  updatedBy={getUserName(refinementData)}
                  updatedAt={formatDate(refinementData?.updatedAt)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}