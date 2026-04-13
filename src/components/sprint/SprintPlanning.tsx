import { useSprintBacklogItems, useUpdateSprintBacklogItem } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { Sprint } from "@/types/sprint";
import { useBacklogSubItems } from "@/hooks/useBacklogs";

interface Props { sprint: Sprint; }

export function SprintPlanning({ sprint }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const updateItem = useUpdateSprintBacklogItem();

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t.name]));

  const handleChecklistUpdate = (itemId: string, field: string, value: string) => {
    updateItem.mutate({ id: itemId, sprintId: sprint.id, [field]: value } as any);
  };

  const handleExportCSV = () => {
    const headers = ["Título", "Responsável", "Estimativa (h)", "Dúvidas", "Acesso", "Dependência", "Ferramental"];
    const rows = sprintItems.map((item) => [
      item.backlog_sub_item_id,
      memberMap[item.team_member_id ?? ""] ?? "—",
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Preencha o checklist obrigatório de cada subitem antes de iniciar a sprint.</p>
        <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {sprintItems.length === 0 && (
        <div className="text-center text-muted-foreground py-8">Nenhum subitem alocado. Vá ao Pré-Planning primeiro.</div>
      )}

      {sprintItems.map((item) => (
        <PlanningChecklist key={item.id} item={item} sprintId={sprint.id} memberName={memberMap[item.team_member_id ?? ""] ?? "—"} onUpdate={handleChecklistUpdate} />
      ))}
    </div>
  );
}

function PlanningChecklist({ item, sprintId, memberName, onUpdate }: { item: any; sprintId: string; memberName: string; onUpdate: (id: string, field: string, value: string) => void }) {
  const [questions, setQuestions] = useState(item.checklist_questions || "");
  const [access, setAccess] = useState(item.checklist_access || "");
  const [dependency, setDependency] = useState(item.checklist_dependency || "");
  const [tools, setTools] = useState(item.checklist_tools || "");

  const allFilled = questions.trim() && access.trim() && dependency.trim() && tools.trim();

  const save = (field: string, value: string) => onUpdate(item.id, field, value);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.backlog_sub_item_id.slice(0, 8)}…</span>
          <Badge variant="outline" className="text-[10px]">{memberName}</Badge>
        </div>
        {allFilled && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Dúvidas</Label>
          <Textarea className="h-16 text-xs" value={questions} onChange={(e) => setQuestions(e.target.value)} onBlur={() => save("checklist_questions", questions)} placeholder="Dúvidas pendentes…" />
        </div>
        <div>
          <Label className="text-xs">Necessidade de Acesso</Label>
          <Textarea className="h-16 text-xs" value={access} onChange={(e) => setAccess(e.target.value)} onBlur={() => save("checklist_access", access)} placeholder="Acessos necessários…" />
        </div>
        <div>
          <Label className="text-xs">Dependência (Time/Cliente)</Label>
          <Textarea className="h-16 text-xs" value={dependency} onChange={(e) => setDependency(e.target.value)} onBlur={() => save("checklist_dependency", dependency)} placeholder="Dependências…" />
        </div>
        <div>
          <Label className="text-xs">Ferramental OK</Label>
          <Textarea className="h-16 text-xs" value={tools} onChange={(e) => setTools(e.target.value)} onBlur={() => save("checklist_tools", tools)} placeholder="Ferramentas configuradas…" />
        </div>
      </div>
    </div>
  );
}
