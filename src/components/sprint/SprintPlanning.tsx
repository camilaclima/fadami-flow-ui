import { useSprintBacklogItems, useUpdateSprintBacklogItem, useUpdateSprint, useSprintMembers, useSprintUnavailabilities, getBusinessDays } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBacklogs, useBacklogSubItems } from "@/hooks/useBacklogs";
import { useBacklogStore } from "@/store/backlogStore";
import { BacklogDetailModal } from "@/components/backlog/BacklogDetailModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, CheckCircle2, Play, Clock, Users, Zap, ChevronDown, ChevronRight, Eye, TrendingUp } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Sprint } from "@/types/sprint";
import { SPECIALTY_LABELS, TEAM_ROLE_LABELS } from "@/types/sprint";
import { EFFORT_AREA_LABELS, COMPLEXITY_LABELS } from "@/types/backlog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props { sprint: Sprint; onAdvance?: () => void; }

export function SprintPlanning({ sprint, onAdvance }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: backlogs = [] } = useBacklogs();
  const { data: sprintMembers = [] } = useSprintMembers(sprint.id);
  const { data: unavailabilities = [] } = useSprintUnavailabilities(sprint.id);
  const updateItem = useUpdateSprintBacklogItem();
  const updateSprint = useUpdateSprint();
  const { fetchAll, backlogs: storeBacklogs } = useBacklogStore();

  useEffect(() => { fetchAll(); }, []);

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const backlogMap = Object.fromEntries(backlogs.map((b) => [b.id, b]));

  // State
  const [expandedBacklogs, setExpandedBacklogs] = useState<Set<string>>(new Set());
  const [detailBacklogId, setDetailBacklogId] = useState<string | null>(null);
  const [viewSubItem, setViewSubItem] = useState<any | null>(null);

  // Group items by backlog
  const grouped = useMemo(() => {
    const map: Record<string, typeof sprintItems> = {};
    sprintItems.forEach((item) => {
      if (!map[item.backlog_id]) map[item.backlog_id] = [];
      map[item.backlog_id].push(item);
    });
    return map;
  }, [sprintItems]);

  // Auto-expand all
  useEffect(() => {
    setExpandedBacklogs(new Set(Object.keys(grouped)));
  }, [Object.keys(grouped).join(",")]);

  // Capacity summary
  const businessDays = getBusinessDays(sprint.start_date, sprint.end_date);
  const totalHoursBase = sprintMembers.reduce((sum, m) => {
    const tm = memberMap[m.team_member_id];
    return sum + (tm ? tm.daily_capacity_hours * businessDays : 0);
  }, 0);
  const totalUnavailHours = unavailabilities.reduce((sum, u) => sum + u.hours, 0);
  const usefulCapacity = (totalHoursBase - totalUnavailHours - sprint.ritual_hours) * (1 - sprint.sustentation_percent / 100);
  const allocatedHours = sprintItems.reduce((sum, item) => sum + (item.actual_hours || 0), 0);

  const toggleBacklog = (id: string) => {
    setExpandedBacklogs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleChecklistUpdate = (itemId: string, field: string, value: string) => {
    updateItem.mutate({ id: itemId, sprintId: sprint.id, [field]: value } as any);
  };

  const handleStartSprint = () => {
    updateSprint.mutate({ id: sprint.id, status: "active" as any });
    toast.success("Sprint iniciada! 🚀");
    onAdvance?.();
  };

  const handleExportCSV = () => {
    const headers = ["Backlog", "Subtarefa", "Responsável", "Estimativa (h)", "Dúvidas", "Acesso", "Dependência", "Ferramental"];
    const rows = sprintItems.map((item) => [
      backlogMap[item.backlog_id]?.title ?? item.backlog_id,
      item.backlog_sub_item_id.slice(0, 8),
      memberMap[item.team_member_id ?? ""]?.name ?? "—",
      item.actual_hours.toString(),
      item.checklist_questions,
      item.checklist_access,
      item.checklist_dependency,
      item.checklist_tools,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sprint-${sprint.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const detailBacklogItem = detailBacklogId ? storeBacklogs.find((b) => b.id === detailBacklogId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-primary" /><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Colaboradores</p></div>
          <p className="text-2xl font-bold text-foreground">{sprintMembers.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-primary" /><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Itens Alocados</p></div>
          <p className="text-2xl font-bold text-foreground">{sprintItems.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-primary" /><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Horas Alocadas</p></div>
          <p className="text-2xl font-bold text-foreground">{allocatedHours.toFixed(0)}h</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Capacity Útil</p></div>
          <p className="text-2xl font-bold text-foreground">{usefulCapacity.toFixed(0)}h</p>
          <Progress value={usefulCapacity > 0 ? (allocatedHours / usefulCapacity) * 100 : 0} className="h-1.5 mt-2" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Revise as alocações e preencha o checklist antes de iniciar a sprint.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Backlogs hierarchy */}
      {sprintItems.length === 0 && (
        <div className="text-center text-muted-foreground py-8 bg-card border border-border rounded-xl">Nenhum subitem alocado. Vá ao Pré-Planning primeiro.</div>
      )}

      {Object.entries(grouped).map(([backlogId, items]) => {
        const backlog = backlogMap[backlogId];
        const expanded = expandedBacklogs.has(backlogId);
        const totalHours = items.reduce((s, i) => s + (i.actual_hours || 0), 0);

        return (
          <div key={backlogId} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <button onClick={() => toggleBacklog(backlogId)} className="flex items-center gap-2 flex-1 text-left">
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1">
                  <span className="font-medium text-sm">{backlog?.title ?? backlogId.slice(0, 8)}</span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{items.length} subtarefas</span>
                    <span>•</span>
                    <span>{totalHours.toFixed(0)}h alocadas</span>
                  </div>
                </div>
              </button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailBacklogId(backlogId)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </div>

            {expanded && (
              <div className="border-t border-border divide-y divide-border">
                {items.map((item) => (
                  <PlanningSubItem
                    key={item.id}
                    item={item}
                    sprintId={sprint.id}
                    member={memberMap[item.team_member_id ?? ""]}
                    backlogId={backlogId}
                    onUpdate={handleChecklistUpdate}
                    onViewSubItem={setViewSubItem}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Start Sprint */}
      <div className="flex justify-end">
        <Button onClick={handleStartSprint} className="gap-2" size="lg">
          <Play className="w-4 h-4" />
          Rodar Sprint
        </Button>
      </div>

      {/* Backlog Detail Modal */}
      <BacklogDetailModal item={detailBacklogItem} open={!!detailBacklogId} onOpenChange={(o) => !o && setDetailBacklogId(null)} />

      {/* SubItem Detail Modal */}
      <Dialog open={!!viewSubItem} onOpenChange={(o) => !o && setViewSubItem(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewSubItem?.title}</DialogTitle>
          </DialogHeader>
          {viewSubItem && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                {viewSubItem.effort_area && <Badge className="bg-primary/10 text-primary border-primary/20">{EFFORT_AREA_LABELS[viewSubItem.effort_area] ?? viewSubItem.effort_area}</Badge>}
                {viewSubItem.complexity && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{COMPLEXITY_LABELS[viewSubItem.complexity] ?? viewSubItem.complexity}</Badge>}
                <Badge variant="outline">{viewSubItem.estimate}h</Badge>
              </div>
              {viewSubItem.functional_detail && <div><strong className="text-foreground">Detalhe Funcional:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.functional_detail}</p></div>}
              {viewSubItem.technical_detail && <div><strong className="text-foreground">Detalhe Técnico:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.technical_detail}</p></div>}
              {viewSubItem.implementation_notes && <div><strong className="text-foreground">Notas:</strong><p className="text-muted-foreground whitespace-pre-wrap mt-1">{viewSubItem.implementation_notes}</p></div>}
              {viewSubItem.code_block && <div><strong className="text-foreground">Código:</strong><pre className="bg-muted p-3 rounded-lg text-xs overflow-auto mt-1">{viewSubItem.code_block}</pre></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanningSubItem({ item, sprintId, member, backlogId, onUpdate, onViewSubItem }: {
  item: any; sprintId: string; member: any; backlogId: string;
  onUpdate: (id: string, field: string, value: string) => void;
  onViewSubItem: (si: any) => void;
}) {
  const { data: subItems = [] } = useBacklogSubItems(backlogId);
  const subItem = subItems.find((si: any) => si.id === item.backlog_sub_item_id);

  const [questions, setQuestions] = useState(item.checklist_questions || "");
  const [access, setAccess] = useState(item.checklist_access || "");
  const [dependency, setDependency] = useState(item.checklist_dependency || "");
  const [tools, setTools] = useState(item.checklist_tools || "");

  const allFilled = questions.trim() && access.trim() && dependency.trim() && tools.trim();
  const save = (field: string, value: string) => onUpdate(item.id, field, value);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <button className="text-sm font-medium hover:text-primary transition-colors" onClick={() => subItem && onViewSubItem(subItem)}>
            {subItem?.title ?? item.backlog_sub_item_id.slice(0, 8)}
          </button>
          {member && <Badge variant="outline" className="text-[10px]">{member.name}</Badge>}
          <Badge variant="outline" className="text-[10px] font-mono">{item.actual_hours}h</Badge>
          {subItem?.effort_area && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{EFFORT_AREA_LABELS[subItem.effort_area] ?? subItem.effort_area}</Badge>}
          {subItem?.complexity && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{COMPLEXITY_LABELS[subItem.complexity] ?? subItem.complexity}</Badge>}
          {item.deadline && <Badge variant="outline" className="text-[10px]">Prazo: {format(new Date(item.deadline), "dd/MM/yy")}</Badge>}
        </div>
        {allFilled && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Dúvidas</Label>
          <Textarea className="h-14 text-xs" value={questions} onChange={(e) => setQuestions(e.target.value)} onBlur={() => save("checklist_questions", questions)} placeholder="Dúvidas pendentes…" />
        </div>
        <div>
          <Label className="text-xs">Necessidade de Acesso</Label>
          <Textarea className="h-14 text-xs" value={access} onChange={(e) => setAccess(e.target.value)} onBlur={() => save("checklist_access", access)} placeholder="Acessos necessários…" />
        </div>
        <div>
          <Label className="text-xs">Dependência</Label>
          <Textarea className="h-14 text-xs" value={dependency} onChange={(e) => setDependency(e.target.value)} onBlur={() => save("checklist_dependency", dependency)} placeholder="Dependências…" />
        </div>
        <div>
          <Label className="text-xs">Ferramental</Label>
          <Textarea className="h-14 text-xs" value={tools} onChange={(e) => setTools(e.target.value)} onBlur={() => save("checklist_tools", tools)} placeholder="Ferramentas configuradas…" />
        </div>
      </div>
    </div>
  );
}
