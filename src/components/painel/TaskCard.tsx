import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pencil, Trash2, Sparkles, User as UserIcon } from "lucide-react";
import { CoordinatorTask, useResolveTask, useDeleteTask } from "@/hooks/useCoordinatorTasks";
import { CobrancaPopover } from "./CobrancaPopover";
import { RealocacaoPopover } from "./RealocacaoPopover";
import { AdiarPrazoPopover } from "./AdiarPrazoPopover";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

const URGENCY: Record<string, { label: string; cls: string }> = {
  critical: { label: "Crítico", cls: "bg-destructive text-destructive-foreground animate-pulse" },
  high: { label: "Alto", cls: "bg-orange-500 text-white" },
  medium: { label: "Médio", cls: "bg-yellow-500 text-black" },
  low: { label: "Baixo", cls: "bg-muted text-foreground" },
};

export function TaskCard({
  task,
  productName,
  sprintName,
  memberName,
  onEdit,
}: {
  task: CoordinatorTask;
  productName?: string;
  sprintName?: string;
  memberName?: string;
  onEdit?: (t: CoordinatorTask) => void;
}) {
  const resolve = useResolveTask();
  const del = useDeleteTask();
  const [leaving, setLeaving] = useState(false);

  const handleResolve = async () => {
    setLeaving(true);
    setTimeout(async () => { await resolve.mutateAsync(task.id); }, 250);
  };

  const u = URGENCY[task.urgency] ?? URGENCY.medium;
  const sourceLabel = task.source === "ai" ? "Gerado pela IA" : "Manual";
  const dailyHint = task.daily_status_id ? " após a Daily" : "";

  return (
    <Card className={`transition-all ${leaving ? "opacity-0 scale-95" : "animate-fade-in"} neu-card`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge className={u.cls}>{u.label}</Badge>
              {productName && <Badge variant="outline">{productName}</Badge>}
              {sprintName && <Badge variant="secondary">Sprint: {sprintName}</Badge>}
              {task.source === "ai" && (
                <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> {sourceLabel}</Badge>
              )}
            </div>
            <p className="font-semibold leading-tight">{task.title}</p>
            {task.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
              <span>Gerado {relTime(task.created_at)}{task.source === "ai" ? dailyHint : ""}</span>
              {memberName && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {memberName}</span>}
              {task.deadline_date && <span>Prazo: {new Date(task.deadline_date).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {task.category === "blocker" && (
            <CobrancaPopover message={task.ai_message} title={task.title} />
          )}
          {task.category === "schedule_risk" && (
            <>
              <RealocacaoPopover activityId={task.activity_id} />
              <AdiarPrazoPopover activityId={task.activity_id} />
            </>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(task)} className="gap-1">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleResolve} className="gap-1 ml-auto">
            <CheckCircle2 className="w-4 h-4" /> Marcar como Resolvido
          </Button>
          <Button size="sm" variant="ghost" onClick={() => del.mutate(task.id)} className="text-muted-foreground">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}