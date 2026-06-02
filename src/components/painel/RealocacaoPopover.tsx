import { useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Repeat } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useActivities, useUpdateActivity } from "@/hooks/useActivities";
import { toast } from "sonner";

export function RealocacaoPopover({ activityId }: { activityId: string | null }) {
  const { data: members = [] } = useTeamMembers();
  const { data: activities = [] } = useActivities(null);
  const update = useUpdateActivity();

  const activity = useMemo(() => activities.find((a) => a.id === activityId), [activities, activityId]);

  const loadByMember = useMemo(() => {
    const map: Record<string, number> = {};
    activities.filter((a) => a.status !== "done").forEach((a) => {
      (a.responsible_ids ?? []).forEach((rid) => { map[rid] = (map[rid] ?? 0) + 1; });
    });
    return map;
  }, [activities]);

  const candidates = useMemo(() => {
    return [...members]
      .map((m) => ({ ...m, load: loadByMember[m.id] ?? 0 }))
      .sort((a, b) => a.load - b.load)
      .slice(0, 6);
  }, [members, loadByMember]);

  const reassign = async (memberId: string) => {
    if (!activity) {
      toast.error("Nenhuma atividade vinculada para realocar");
      return;
    }
    await update.mutateAsync({ id: activity.id, responsible_ids: [memberId], responsible_id: memberId } as any);
    toast.success("Atividade realocada");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Repeat className="w-4 h-4" /> Sugerir Realocação</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <p className="text-sm font-medium">Membros com menor carga</p>
          {!activity && <p className="text-xs text-muted-foreground">Esta tarefa não tem atividade vinculada para realocar.</p>}
          <div className="space-y-1 max-h-64 overflow-auto">
            {candidates.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-accent">
                <div>
                  <p className="text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.load} atividade(s) ativa(s) · {m.specialty}</p>
                </div>
                <Button size="sm" variant="ghost" disabled={!activity} onClick={() => reassign(m.id)}>Passar</Button>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}