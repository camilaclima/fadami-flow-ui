import { useSprintBacklogItems, useUpdateSprintBacklogItem, useUpdateSprint, useSprintMembers, useSprintUnavailabilities, getBusinessDays } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBacklogs, useBacklogSubItems } from "@/hooks/useBacklogs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle2, Play, Clock, Users, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { Sprint } from "@/types/sprint";
import { SPECIALTY_LABELS, TEAM_ROLE_LABELS, SPRINT_ITEM_STATUS_LABELS } from "@/types/sprint";
import { EFFORT_AREA_LABELS } from "@/types/backlog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props { sprint: Sprint; }

export function SprintPlanning({ sprint }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: backlogs = [] } = useBacklogs();
  const { data: sprintMembers = [] } = useSprintMembers(sprint.id);
  const { data: unavailabilities = [] } = useSprintUnavailabilities(sprint.id);
  const updateItem = useUpdateSprintBacklogItem();
  const updateSprint = useUpdateSprint();

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const backlogMap = Object.fromEntries(backlogs.map((b) => [b.id, b]));

  // Group items by backlog
  const grouped = useMemo(() => {
    const map: Record<string, typeof sprintItems> = {};
    sprintItems.forEach((item) => {
      if (!map[item.backlog_id]) map[item.backlog_id] = [];
      map[item.backlog_id].push(item);
    });
    return map;
  }, [sprintItems]);

  // Capacity summary
  const businessDays = getBusinessDays(sprint.start_date, sprint.end_date);
  const memberTeamMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const totalHoursBase = sprintMembers.reduce((sum, m) => {
    const tm = memberTeamMap[m.team_member_id];
    return sum + (tm ? tm.daily_capacity_hours * businessDays : 0);
  }, 0);
  const totalUnavailHours = unavailabilities.reduce((sum, u) => sum + u.hours, 0);
  const usefulCapacity = (totalHoursBase - totalUnavailHours - sprint.ritual_hours) * (1 - sprint.sustentation_percent / 100);
  const allocatedHours = sprintItems.reduce((sum, item) => sum + (item.actual_hours || 0), 0);

  const [expandedBacklogs, setExpandedBacklogs] = useState<Set<string>>(new Set(Object.keys(grouped)));

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
          <div className="flex items-center gap-2 mb-1"><TrendingUpIcon className="w-4 h-4 text-emerald-500" /><p className="text-[11px] text-muted-foreground uppercase tracking-wider">Capacity Útil</p></div>
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
            <button onClick={() => toggleBacklog(backlogId)} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1 text-left">
                <span className="font-medium text-sm">{backlog?.title ?? backlogId.slice(0, 8)}</span>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                  <span>{items.length} subtarefas</span>
                  <span>•</span>
                  <span>{totalHours.toFixed(0)}h alocadas</span>
                </div>
              </div>
            </button>

            {expanded && (
              <div className="border-t border-border divide-y divide-border">
                {items.map((item) => (
                  <PlanningChecklist key={item.id} item={item} sprintId={sprint.id} member={memberMap[item.team_member_id ?? ""]} onUpdate={handleChecklistUpdate} />
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
    </div>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  );
}

function PlanningChecklist({ item, sprintId, member, onUpdate }: { item: any; sprintId: string; member: any; onUpdate: (id: string, field: string, value: string) => void }) {
  const [questions, setQuestions] = useState(item.checklist_questions || "");
  const [access, setAccess] = useState(item.checklist_access || "");
  const [dependency, setDependency] = useState(item.checklist_dependency || "");
  const [tools, setTools] = useState(item.checklist_tools || "");

  const allFilled = questions.trim() && access.trim() && dependency.trim() && tools.trim();
  const save = (field: string, value: string) => onUpdate(item.id, field, value);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-sm font-medium">{item.backlog_sub_item_id.slice(0, 8)}…</span>
          {member && <Badge variant="outline" className="text-[10px]">{member.name}</Badge>}
          <span className="text-[11px] text-muted-foreground">{item.actual_hours}h</span>
          {item.deadline && <span className="text-[11px] text-muted-foreground">Prazo: {format(new Date(item.deadline), "dd/MM/yy")}</span>}
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
