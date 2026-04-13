import { useSprintBacklogItems, useUpdateSprintBacklogItem } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { Sprint, SprintItemStatus } from "@/types/sprint";

interface Props { sprint: Sprint; }

const STATUS_COLS: { key: SprintItemStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "bg-blue-500/15 text-blue-600" },
  { key: "doing", label: "Doing", color: "bg-amber-500/15 text-amber-600" },
  { key: "done", label: "Done", color: "bg-emerald-500/15 text-emerald-600" },
];

export function SprintExecution({ sprint }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const updateItem = useUpdateSprintBacklogItem();

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t.name]));

  const moveItem = (itemId: string, newStatus: SprintItemStatus) => {
    updateItem.mutate({ id: itemId, sprintId: sprint.id, status: newStatus } as any);
  };

  const updateField = (itemId: string, field: string, value: any) => {
    updateItem.mutate({ id: itemId, sprintId: sprint.id, [field]: value } as any);
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Kanban de subitens da sprint. Arraste entre colunas movendo o status.</p>

      <div className="grid grid-cols-3 gap-4">
        {STATUS_COLS.map((col) => {
          const items = sprintItems.filter((i) => i.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`${col.color} text-xs`}>{col.label}</Badge>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>

              {items.map((item) => {
                const hasExpiredImpediment = item.impediment_text && item.impediment_deadline && new Date(item.impediment_deadline) < now;
                return (
                  <div key={item.id} className={`bg-card border rounded-lg p-3 space-y-2 ${hasExpiredImpediment ? "border-destructive" : "border-border"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{item.backlog_sub_item_id.slice(0, 8)}…</span>
                      {hasExpiredImpediment && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{memberMap[item.team_member_id ?? ""] ?? "—"}</p>

                    {/* Move buttons */}
                    <div className="flex gap-1">
                      {STATUS_COLS.filter((c) => c.key !== col.key).map((c) => (
                        <Button key={c.key} size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveItem(item.id, c.key)}>
                          → {c.label}
                        </Button>
                      ))}
                    </div>

                    {/* Actual hours */}
                    <div>
                      <Label className="text-[10px]">Horas Reais</Label>
                      <Input type="number" min={0} step={0.5} className="h-7 text-xs" defaultValue={item.actual_hours}
                        onBlur={(e) => updateField(item.id, "actual_hours", Number(e.target.value))} />
                    </div>

                    {/* Impediment */}
                    <div>
                      <Label className="text-[10px]">Impedimento</Label>
                      <Textarea className="h-12 text-[10px]" defaultValue={item.impediment_text}
                        onBlur={(e) => updateField(item.id, "impediment_text", e.target.value)} placeholder="Descreva o impedimento…" />
                      <Input type="date" className="h-7 text-xs mt-1" defaultValue={item.impediment_deadline ?? ""}
                        onChange={(e) => updateField(item.id, "impediment_deadline", e.target.value || null)} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
