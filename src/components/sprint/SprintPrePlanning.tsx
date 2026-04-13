import { useBacklogs, useBacklogSubItems } from "@/hooks/useBacklogs";
import { useSprintBacklogItems, useAddSprintBacklogItem, useRemoveSprintBacklogItem, useSprintMembers } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Sprint } from "@/types/sprint";
import { isSpecialtyCompatible, SPECIALTY_LABELS } from "@/types/sprint";
import { EFFORT_AREA_LABELS } from "@/types/backlog";

interface Props { sprint: Sprint; }

export function SprintPrePlanning({ sprint }: Props) {
  const { data: backlogs = [] } = useBacklogs();
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: sprintMembers = [] } = useSprintMembers(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const addItem = useAddSprintBacklogItem();
  const removeItem = useRemoveSprintBacklogItem();

  const [expandedBacklog, setExpandedBacklog] = useState<string | null>(null);

  const availableBacklogs = backlogs.filter((b) => b.phase === "available" || b.phase === "planned");
  const allocatedSubItemIds = new Set(sprintItems.map((si) => si.backlog_sub_item_id));

  const memberTeamMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));
  const sprintTeamMemberIds = new Set(sprintMembers.map((m) => m.team_member_id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione backlogs disponíveis e aloque subitens aos membros da sprint. Apenas colaboradores com especialidade compatível serão listados.
      </p>

      {availableBacklogs.length === 0 && (
        <div className="text-center text-muted-foreground py-8">Nenhum backlog disponível para alocação.</div>
      )}

      {availableBacklogs.map((backlog) => (
        <BacklogAllocator
          key={backlog.id}
          backlogId={backlog.id}
          backlogTitle={backlog.title}
          expanded={expandedBacklog === backlog.id}
          onToggle={() => setExpandedBacklog(expandedBacklog === backlog.id ? null : backlog.id)}
          sprintId={sprint.id}
          allocatedSubItemIds={allocatedSubItemIds}
          sprintTeamMemberIds={sprintTeamMemberIds}
          memberTeamMap={memberTeamMap}
          onAdd={(subItemId, teamMemberId) => addItem.mutate({ sprint_id: sprint.id, backlog_sub_item_id: subItemId, backlog_id: backlog.id, team_member_id: teamMemberId, status: "todo" })}
          onRemove={(itemId) => removeItem.mutate({ id: itemId, sprintId: sprint.id })}
          sprintItems={sprintItems}
        />
      ))}
    </div>
  );
}

function BacklogAllocator({ backlogId, backlogTitle, expanded, onToggle, sprintId, allocatedSubItemIds, sprintTeamMemberIds, memberTeamMap, onAdd, onRemove, sprintItems }: {
  backlogId: string; backlogTitle: string; expanded: boolean; onToggle: () => void;
  sprintId: string; allocatedSubItemIds: Set<string>; sprintTeamMemberIds: Set<string>;
  memberTeamMap: Record<string, any>; onAdd: (subItemId: string, teamMemberId: string | null) => void;
  onRemove: (itemId: string) => void; sprintItems: any[];
}) {
  const { data: subItems = [] } = useBacklogSubItems(expanded ? backlogId : undefined);
  const [selectedDev, setSelectedDev] = useState<Record<string, string>>({});

  const allocatedInSprint = sprintItems.filter((si) => si.backlog_id === backlogId);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-4 hover:bg-muted/30 transition-colors">
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="font-medium text-sm">{backlogTitle}</span>
        {allocatedInSprint.length > 0 && (
          <Badge variant="outline" className="text-[10px] ml-auto">{allocatedInSprint.length} alocado(s)</Badge>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-2">
          {subItems.map((si: any) => {
            const isAllocated = allocatedSubItemIds.has(si.id);
            const sprintItem = sprintItems.find((x) => x.backlog_sub_item_id === si.id);
            const effortArea = si.effort_area || "";

            // Filter compatible members
            const compatibleMembers = Array.from(sprintTeamMemberIds)
              .map((id) => memberTeamMap[id])
              .filter(Boolean)
              .filter((tm) => isSpecialtyCompatible(tm.specialty, effortArea));

            return (
              <div key={si.id} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{si.title}</span>
                  {effortArea && (
                    <Badge variant="outline" className="ml-2 text-[10px]">{EFFORT_AREA_LABELS[effortArea] ?? effortArea}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">{si.estimate}h</span>
                </div>

                {!isAllocated ? (
                  <div className="flex items-center gap-2">
                    <Select value={selectedDev[si.id] ?? ""} onValueChange={(v) => setSelectedDev((p) => ({ ...p, [si.id]: v }))}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Dev" /></SelectTrigger>
                      <SelectContent>
                        {compatibleMembers.map((tm) => (
                          <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                        ))}
                        {compatibleMembers.length === 0 && (
                          <SelectItem value="" disabled>Sem dev compatível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => onAdd(si.id, selectedDev[si.id] || null)} disabled={!selectedDev[si.id]}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]">Alocado</Badge>
                    {sprintItem && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onRemove(sprintItem.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {subItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum subitem neste backlog.</p>
          )}
        </div>
      )}
    </div>
  );
}
