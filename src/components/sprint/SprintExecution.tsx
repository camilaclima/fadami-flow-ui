import { useSprintBacklogItems, useUpdateSprintBacklogItem, useUpdateSprint, useSprintMembers, useSprintUnavailabilities, getBusinessDays, useSprintDiaryEntries, useAddSprintDiaryEntry } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBacklogs, useBacklogSubItems } from "@/hooks/useBacklogs";
import { useBacklogStore } from "@/store/backlogStore";
import { BacklogDetailModal } from "@/components/backlog/BacklogDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Clock, Pause, XCircle, Play, Flag, Users, Zap, TrendingDown, Eye, MessageSquare, Send } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Sprint, SprintItemStatus } from "@/types/sprint";
import { SPRINT_ITEM_STATUS_LABELS, SPRINT_ITEM_STATUS_STYLES, SPECIALTY_LABELS } from "@/types/sprint";
import { EFFORT_AREA_LABELS, COMPLEXITY_LABELS } from "@/types/backlog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props { sprint: Sprint; }

const STATUS_ICONS: Record<SprintItemStatus, any> = {
  pending: Clock,
  in_progress: Play,
  paused: Pause,
  withdrawn: XCircle,
  completed: CheckCircle2,
};

export function SprintExecution({ sprint }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: backlogs = [] } = useBacklogs();
  const { data: sprintMembers = [] } = useSprintMembers(sprint.id);
  const { data: unavailabilities = [] } = useSprintUnavailabilities(sprint.id);
  const { data: diaryEntries = [] } = useSprintDiaryEntries(sprint.id);
  const addDiaryEntry = useAddSprintDiaryEntry();
  const updateItem = useUpdateSprintBacklogItem();
  const updateSprint = useUpdateSprint();
  const { fetchAll, backlogs: storeBacklogs } = useBacklogStore();

  useEffect(() => { fetchAll(); }, []);

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const backlogMap = Object.fromEntries(backlogs.map((b) => [b.id, b]));

  const [completionModal, setCompletionModal] = useState<string | null>(null);
  const [completionHours, setCompletionHours] = useState(0);
  const [withdrawnModal, setWithdrawnModal] = useState<string | null>(null);
  const [withdrawnReason, setWithdrawnReason] = useState("");
  const [detailBacklogId, setDetailBacklogId] = useState<string | null>(null);
  const [viewSubItem, setViewSubItem] = useState<any | null>(null);
  const [itemNoteModal, setItemNoteModal] = useState<string | null>(null);
  const [itemNote, setItemNote] = useState("");
  const [diaryNote, setDiaryNote] = useState("");
  const [diaryItemId, setDiaryItemId] = useState<string>("");

  // KPIs
  const completedItems = sprintItems.filter((i) => i.status === "completed");
  const withdrawnItems = sprintItems.filter((i) => i.status === "withdrawn");
  const inProgressItems = sprintItems.filter((i) => i.status === "in_progress");
  const pendingItems = sprintItems.filter((i) => i.status === "pending");
  const pausedItems = sprintItems.filter((i) => i.status === "paused");

  const totalPlannedHours = sprintItems.reduce((s, i) => s + (i.actual_hours || 0), 0);
  const completedHours = completedItems.reduce((s, i) => s + (i.actual_hours || 0), 0);
  const remainingHours = totalPlannedHours - completedHours;

  const now = new Date();
  const nearDeadlineItems = sprintItems.filter((i) => {
    if (i.status === "completed" || i.status === "withdrawn" || !i.deadline) return false;
    const dl = new Date(i.deadline);
    const diff = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 2 && diff >= 0;
  });
  const overdueItems = sprintItems.filter((i) => {
    if (i.status === "completed" || i.status === "withdrawn" || !i.deadline) return false;
    return new Date(i.deadline) < now;
  });

  // Per-member stats with estimated vs completed
  const businessDays = getBusinessDays(sprint.start_date, sprint.end_date);
  const memberStats = useMemo(() => {
    return sprintMembers.map((m) => {
      const tm = memberMap[m.team_member_id];
      if (!tm) return null;
      const items = sprintItems.filter((si) => si.team_member_id === m.team_member_id);
      const estimatedH = items.reduce((s, i) => s + (i.actual_hours || 0), 0);
      const doneH = items.filter((i) => i.status === "completed").reduce((s, i) => s + (i.actual_hours || 0), 0);
      const base = tm.daily_capacity_hours * businessDays;
      const unavail = unavailabilities.filter((u) => u.sprint_member_id === m.id).reduce((s, u) => s + u.hours, 0);
      const capacity = (base - unavail) * (1 - sprint.sustentation_percent / 100);
      return { ...tm, estimatedH, doneH, capacity, pct: estimatedH > 0 ? (doneH / estimatedH) * 100 : 0 };
    }).filter(Boolean) as any[];
  }, [sprintMembers, sprintItems, memberMap, unavailabilities, businessDays, sprint.sustentation_percent]);

  // Group by backlog
  const grouped = useMemo(() => {
    const map: Record<string, typeof sprintItems> = {};
    sprintItems.forEach((item) => {
      if (!map[item.backlog_id]) map[item.backlog_id] = [];
      map[item.backlog_id].push(item);
    });
    return map;
  }, [sprintItems]);

  const allFinished = sprintItems.length > 0 && sprintItems.every((i) => i.status === "completed" || i.status === "withdrawn");

  const handleStatusChange = (itemId: string, newStatus: SprintItemStatus) => {
    if (newStatus === "completed") {
      setCompletionModal(itemId);
      const item = sprintItems.find((i) => i.id === itemId);
      setCompletionHours(item?.actual_hours || 0);
      return;
    }
    if (newStatus === "withdrawn") {
      setWithdrawnModal(itemId);
      setWithdrawnReason("");
      return;
    }
    updateItem.mutate({ id: itemId, sprintId: sprint.id, status: newStatus } as any);
  };

  const confirmCompletion = () => {
    if (!completionModal) return;
    updateItem.mutate({ id: completionModal, sprintId: sprint.id, status: "completed", actual_hours: completionHours } as any);
    setCompletionModal(null);
    toast.success("Tarefa concluída!");
  };

  const confirmWithdrawn = () => {
    if (!withdrawnModal) return;
    updateItem.mutate({ id: withdrawnModal, sprintId: sprint.id, status: "withdrawn", impediment_text: withdrawnReason } as any);
    // Auto diary entry
    addDiaryEntry.mutate({ sprint_id: sprint.id, sprint_backlog_item_id: withdrawnModal, content: `Item retirado: ${withdrawnReason}`, created_by: "Sistema" });
    setWithdrawnModal(null);
    toast.info("Item retirado da sprint.");
  };

  const handleFinalizeSprint = () => {
    updateSprint.mutate({ id: sprint.id, status: "finished" as any });
    toast.success("Sprint finalizada! 🎉");
  };

  const handleAddItemNote = () => {
    if (!itemNoteModal || !itemNote.trim()) return;
    addDiaryEntry.mutate({ sprint_id: sprint.id, sprint_backlog_item_id: itemNoteModal, content: itemNote, created_by: "" });
    setItemNote("");
    setItemNoteModal(null);
    toast.success("Anotação registrada no diário!");
  };

  const handleAddDiaryNote = () => {
    if (!diaryNote.trim()) return;
    addDiaryEntry.mutate({
      sprint_id: sprint.id,
      sprint_backlog_item_id: diaryItemId || null,
      content: diaryNote,
      created_by: "",
    });
    setDiaryNote("");
    setDiaryItemId("");
    toast.success("Anotação adicionada ao diário!");
  };

  // Build sub-item name map across all backlog groups
  const allBacklogIds = Object.keys(grouped);
  const subItemNameMap = useSubItemNames(allBacklogIds);

  const detailBacklogItem = detailBacklogId ? storeBacklogs.find((b) => b.id === detailBacklogId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={CheckCircle2} label="Concluídos" value={`${completedItems.length}`} color="text-emerald-600" />
        <KpiCard icon={Clock} label="Horas Concluídas" value={`${completedHours.toFixed(0)}h`} color="text-emerald-600" />
        <KpiCard icon={TrendingDown} label="Horas Restantes" value={`${remainingHours.toFixed(0)}h`} color="text-primary" />
        <KpiCard icon={AlertTriangle} label="Atrasados" value={`${overdueItems.length}`} color={overdueItems.length > 0 ? "text-destructive" : "text-muted-foreground"} />
        <KpiCard icon={Flag} label="Atenção" value={`${nearDeadlineItems.length}`} color={nearDeadlineItems.length > 0 ? "text-amber-500" : "text-muted-foreground"} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Pendentes" count={pendingItems.length} color="text-blue-600" />
        <MiniStat label="Em Andamento" count={inProgressItems.length} color="text-amber-600" />
        <MiniStat label="Pausados" count={pausedItems.length} color="text-orange-600" />
        <MiniStat label="Retirados" count={withdrawnItems.length} color="text-red-600" />
      </div>

      {/* Per-member progress with estimated vs completed */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Progresso por Colaborador
        </h3>
        {memberStats.map((ms) => (
          <div key={ms.id} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium truncate">{ms.name}</span>
                <Badge variant="outline" className="text-[10px]">{SPECIALTY_LABELS[ms.specialty as keyof typeof SPECIALTY_LABELS] ?? ms.specialty}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={ms.pct} className="h-2.5 flex-1 [&>div]:bg-emerald-500" />
                <span className="text-xs font-mono min-w-[120px] text-right text-muted-foreground">
                  {ms.doneH.toFixed(0)}h / {ms.estimatedH.toFixed(0)}h est. ({ms.pct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Items by backlog */}
      {Object.entries(grouped).map(([backlogId, items]) => {
        const backlog = backlogMap[backlogId];
        return (
          <div key={backlogId} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{backlog?.title ?? backlogId.slice(0, 8)}</span>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>{items.length} itens</span>
                  <span>•</span>
                  <span>{items.filter((i) => i.status === "completed").length} concluídos</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailBacklogId(backlogId)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => {
                const tm = memberMap[item.team_member_id ?? ""];
                const status = item.status as SprintItemStatus;
                const StatusIcon = STATUS_ICONS[status] || Clock;
                const isOverdue = item.deadline && new Date(item.deadline) < now && status !== "completed" && status !== "withdrawn";
                const isFinal = status === "completed" || status === "withdrawn";
                const subName = subItemNameMap[item.backlog_sub_item_id];

                return (
                  <div key={item.id} className={`p-4 flex items-center gap-3 ${isOverdue ? "bg-destructive/5" : ""}`}>
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${SPRINT_ITEM_STATUS_STYLES[status]?.split(" ")[1] ?? "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{subName?.title ?? item.backlog_sub_item_id.slice(0, 8)}</span>
                        {tm && <Badge variant="outline" className="text-[10px]">{tm.name}</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${SPRINT_ITEM_STATUS_STYLES[status]}`}>
                          {SPRINT_ITEM_STATUS_LABELS[status]}
                        </Badge>
                        {isOverdue && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Atrasado</Badge>}
                        {subName?.effort_area && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{EFFORT_AREA_LABELS[subName.effort_area] ?? subName.effort_area}</Badge>}
                        {subName?.complexity && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{COMPLEXITY_LABELS[subName.complexity] ?? subName.complexity}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{item.actual_hours}h</span>
                        {item.deadline && <span>Prazo: {format(new Date(item.deadline), "dd/MM/yy")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setItemNoteModal(item.id); setItemNote(""); }}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                      {subName && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewSubItem(subName)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!isFinal && (
                        <Select value={status} onValueChange={(v) => handleStatusChange(item.id, v as SprintItemStatus)}>
                          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["pending", "in_progress", "paused", "withdrawn", "completed"] as SprintItemStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{SPRINT_ITEM_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Sprint Diary with history */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Diário da Sprint
        </h3>

        {/* Diary entries history */}
        {diaryEntries.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {diaryEntries.map((entry: any) => {
              const linkedItem = entry.sprint_backlog_item_id ? sprintItems.find((si) => si.id === entry.sprint_backlog_item_id) : null;
              const linkedSubName = linkedItem ? subItemNameMap[linkedItem.backlog_sub_item_id]?.title : null;
              const linkedBacklogName = linkedItem ? backlogMap[linkedItem.backlog_id]?.title : null;
              return (
                <div key={entry.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
                    <span>{format(new Date(entry.created_at), "dd/MM/yy HH:mm")}</span>
                    {linkedSubName && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px]">{linkedBacklogName} → {linkedSubName}</Badge>
                      </>
                    )}
                  </div>
                  <p className="text-foreground">{entry.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new diary entry */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={diaryItemId} onValueChange={setDiaryItemId}>
              <SelectTrigger className="w-56 h-9 text-xs">
                <SelectValue placeholder="Associar a item (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral (sem vínculo)</SelectItem>
                {sprintItems.map((si) => {
                  const name = subItemNameMap[si.backlog_sub_item_id]?.title ?? si.backlog_sub_item_id.slice(0, 8);
                  return <SelectItem key={si.id} value={si.id}>{name}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Textarea className="min-h-[60px] text-sm flex-1" value={diaryNote} onChange={(e) => setDiaryNote(e.target.value)} placeholder="Anotação para o diário da sprint…" />
            <Button size="sm" className="self-end gap-1" onClick={handleAddDiaryNote} disabled={!diaryNote.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Finalize */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="text-sm text-muted-foreground">
          {allFinished ? (
            <span className="text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Todos os itens finalizados. Pronto para encerrar!</span>
          ) : (
            <span>Finalize todos os itens (Concluído ou Retirado) para encerrar a sprint.</span>
          )}
        </div>
        <Button onClick={handleFinalizeSprint} disabled={!allFinished} className="gap-2">
          <Flag className="w-4 h-4" />
          Finalizar Sprint
        </Button>
      </div>

      {/* Completion Modal */}
      <Dialog open={!!completionModal} onOpenChange={(o) => !o && setCompletionModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Conclusão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Horas reais gastas</Label>
            <Input type="number" min={0} step={0.5} value={completionHours} onChange={(e) => setCompletionHours(Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionModal(null)}>Cancelar</Button>
            <Button onClick={confirmCompletion}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawn Modal */}
      <Dialog open={!!withdrawnModal} onOpenChange={(o) => !o && setWithdrawnModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Retirar Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Justificativa</Label>
            <Textarea value={withdrawnReason} onChange={(e) => setWithdrawnReason(e.target.value)} placeholder="Motivo da retirada…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawnModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmWithdrawn} disabled={!withdrawnReason.trim()}>Confirmar Retirada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Note Modal */}
      <Dialog open={!!itemNoteModal} onOpenChange={(o) => !o && setItemNoteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Anotação do Diário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Observação</Label>
            <Textarea value={itemNote} onChange={(e) => setItemNote(e.target.value)} placeholder="Registre uma observação sobre este item…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemNoteModal(null)}>Cancelar</Button>
            <Button onClick={handleAddItemNote} disabled={!itemNote.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backlog Detail Modal */}
      <BacklogDetailModal item={detailBacklogItem} open={!!detailBacklogId} onOpenChange={(o) => !o && setDetailBacklogId(null)} />

      {/* SubItem Detail Modal */}
      <Dialog open={!!viewSubItem} onOpenChange={(o) => !o && setViewSubItem(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewSubItem?.title}</DialogTitle></DialogHeader>
          {viewSubItem && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                {viewSubItem.effort_area && <Badge className="bg-primary/10 text-primary border-primary/20">{EFFORT_AREA_LABELS[viewSubItem.effort_area] ?? viewSubItem.effort_area}</Badge>}
                {viewSubItem.complexity && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{COMPLEXITY_LABELS[viewSubItem.complexity] ?? viewSubItem.complexity}</Badge>}
                <Badge variant="outline">{viewSubItem.estimate}h</Badge>
              </div>
              {viewSubItem.functional_detail && <div><strong>Detalhe Funcional:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.functional_detail}</p></div>}
              {viewSubItem.technical_detail && <div><strong>Detalhe Técnico:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.technical_detail}</p></div>}
              {viewSubItem.implementation_notes && <div><strong>Notas:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.implementation_notes}</p></div>}
              {viewSubItem.code_block && <div><strong>Código:</strong><pre className="bg-muted p-3 rounded-lg text-xs overflow-auto mt-1">{viewSubItem.code_block}</pre></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Hook to load sub item names for all backlog IDs */
function useSubItemNames(backlogIds: string[]) {
  const results: Record<string, any> = {};
  // We load all at once using individual hooks wouldn't work for dynamic lists
  // Instead we use a single effect-based approach
  const [nameMap, setNameMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (backlogIds.length === 0) return;
    const load = async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("backlog_sub_items")
        .select("id, title, effort_area, complexity, estimate, functional_detail, technical_detail, implementation_notes, code_block")
        .in("backlog_id", backlogIds);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((si: any) => { map[si.id] = si; });
        setNameMap(map);
      }
    };
    load();
  }, [backlogIds.join(",")]);

  return nameMap;
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2">
      <p className={`text-lg font-bold ${color}`}>{count}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
