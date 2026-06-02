import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pencil, Trash2, Sparkles, User as UserIcon, Calendar, AlertTriangle, Puzzle, Megaphone, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const URGENCY: Record<string, { label: string; cls: string; bar: string }> = {
  critical: { label: "Crítico", cls: "bg-destructive text-destructive-foreground animate-pulse", bar: "bg-destructive" },
  high: { label: "Alto", cls: "bg-orange-500 text-white", bar: "bg-orange-500" },
  medium: { label: "Médio", cls: "bg-yellow-500 text-black", bar: "bg-yellow-500" },
  low: { label: "Baixo", cls: "bg-muted text-foreground", bar: "bg-muted-foreground/40" },
};

const CATEGORY_META: Record<string, { label: string; icon: any; cls: string }> = {
  blocker: { label: "Bloqueio", icon: AlertTriangle, cls: "bg-red-500/15 text-red-700 border-red-500/30" },
  schedule_risk: { label: "Risco", icon: CalendarClock, cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  activity: { label: "Atividade", icon: Puzzle, cls: "bg-violet-500/15 text-violet-700 border-violet-500/30" },
  custom: { label: "Personalizada", icon: Megaphone, cls: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
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
  const cat = CATEGORY_META[task.category] ?? CATEGORY_META.custom;
  const CatIcon = cat.icon;
  const sourceLabel = task.source === "ai" ? "Gerado pela IA" : "Manual";
  const dailyHint = task.daily_status_id ? " após a Daily" : "";

  let dlTone: "danger" | "warning" | "info" | "muted" = "muted";
  let dlLabel: string | null = null;
  if (task.deadline_date) {
    try {
      const d = parseISO(task.deadline_date);
      const days = differenceInCalendarDays(d, new Date());
      const date = format(d, "dd MMM", { locale: ptBR });
      if (days < 0) { dlTone = "danger"; dlLabel = `${date} · atrasada ${Math.abs(days)}d`; }
      else if (days === 0) { dlTone = "danger"; dlLabel = `${date} · hoje`; }
      else if (days <= 3) { dlTone = "warning"; dlLabel = `${date} · ${days}d`; }
      else if (days <= 7) { dlTone = "info"; dlLabel = `${date} · ${days}d`; }
      else { dlTone = "muted"; dlLabel = date; }
    } catch { dlLabel = task.deadline_date; }
  }
  const dlClass = {
    danger: "text-red-700 bg-red-500/10 border-red-500/30",
    warning: "text-amber-700 bg-amber-500/10 border-amber-500/30",
    info: "text-blue-700 bg-blue-500/10 border-blue-500/30",
    muted: "text-muted-foreground bg-muted/40 border-border",
  }[dlTone];

  return (
    <Card
      className={cn(
        "relative p-0 overflow-hidden transition-all neu-card group",
        leaving ? "opacity-0 scale-95" : "animate-fade-in"
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", u.bar)} />
      <div className="p-4 pl-5 space-y-3">
        {/* Top: category + urgency */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={cn("text-[10px] border h-5 px-2 gap-1", cat.cls)}>
            <CatIcon className="w-3 h-3" /> {cat.label}
          </Badge>
          <Badge className={cn("h-5 px-2 text-[10px]", u.cls)}>{u.label}</Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        )}

        {/* Chips: deadline + project + sprint + assignee — all unified visual treatment */}
        <div className="flex flex-wrap items-center gap-1.5">
          {dlLabel && (
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1", dlClass)}>
              <Calendar className="w-3 h-3" /> {dlLabel}
            </span>
          )}
          {productName && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 bg-primary/10 text-primary border-primary/30">
              {productName}
            </span>
          )}
          {sprintName && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 bg-violet-500/10 text-violet-700 border-violet-500/30">
              {sprintName}
            </span>
          )}
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1",
            memberName ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"
          )}>
            <UserIcon className="w-3 h-3" /> {memberName ?? "Não atribuído"}
          </span>
          {task.source === "ai" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1 bg-blue-500/10 text-blue-700 border-blue-500/30">
              <Sparkles className="w-3 h-3" /> {sourceLabel}
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {relTime(task.created_at)}{task.source === "ai" ? dailyHint : ""}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
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
            <Button size="sm" variant="outline" onClick={() => onEdit(task)} className="gap-1 h-8">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleResolve} className="gap-1 ml-auto h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4" /> Resolver
          </Button>
          <Button size="sm" variant="ghost" onClick={() => del.mutate(task.id)} className="text-muted-foreground h-8 px-2">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}