import { useSprintBacklogItems, useUpdateSprint } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Sprint } from "@/types/sprint";

interface Props { sprint: Sprint; }

export function SprintClosing({ sprint }: Props) {
  const { data: sprintItems = [] } = useSprintBacklogItems(sprint.id);
  const { data: teamMembers = [] } = useTeamMembers();
  const updateSprint = useUpdateSprint();

  const [diary, setDiary] = useState(sprint.diary ?? "");

  const memberMap = Object.fromEntries(teamMembers.map((t) => [t.id, t]));

  const totalItems = sprintItems.length;
  const doneItems = sprintItems.filter((i) => i.status === "completed").length;
  const withdrawnItems = sprintItems.filter((i) => i.status === "withdrawn").length;
  const completionPct = totalItems > 0 ? ((doneItems + withdrawnItems) / totalItems) * 100 : 0;

  const totalPlannedHours = sprintItems.reduce((s, i) => s + (i.actual_hours || 0), 0);
  const totalActualHours = sprintItems.filter((i) => i.status === "completed").reduce((s, i) => s + (i.actual_hours || 0), 0);

  const memberStats = Object.entries(
    sprintItems.reduce<Record<string, { planned: number; actual: number; done: number; total: number }>>((acc, item) => {
      const mid = item.team_member_id ?? "unassigned";
      if (!acc[mid]) acc[mid] = { planned: 0, actual: 0, done: 0, total: 0 };
      acc[mid].total++;
      acc[mid].planned += item.actual_hours || 0;
      if (item.status === "completed") { acc[mid].done++; acc[mid].actual += item.actual_hours || 0; }
      return acc;
    }, {})
  );

  const saveDiary = () => {
    updateSprint.mutate({ id: sprint.id, diary });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">% Concluída</p>
          <p className="text-2xl font-bold text-foreground mt-1">{completionPct.toFixed(0)}%</p>
          <Progress value={completionPct} className="h-2 mt-2" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Concluídos / Retirados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{doneItems} / {withdrawnItems}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Horas Planejadas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalPlannedHours.toFixed(0)}h</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Horas Executadas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalActualHours.toFixed(0)}h</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Produtividade Individual</h3>
        {memberStats.map(([mid, stats]) => {
          const tm = memberMap[mid];
          return (
            <div key={mid} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
              <span className="text-sm font-medium w-40 truncate">{tm?.name ?? "Sem responsável"}</span>
              <div className="flex-1">
                <Progress value={stats.total > 0 ? (stats.done / stats.total) * 100 : 0} className="h-2" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">{stats.done}/{stats.total} itens | {stats.actual}h/{stats.planned}h</span>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Diário da Sprint</h3>
        <Textarea className="min-h-[120px]" value={diary} onChange={(e) => setDiary(e.target.value)} placeholder="Anotações livres sobre a sprint…" />
        <Button size="sm" onClick={saveDiary}>Salvar Diário</Button>
      </div>
    </div>
  );
}
