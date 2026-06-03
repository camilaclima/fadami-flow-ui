import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, User, Calendar, AlertTriangle, ListTodo, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActivities, useUpdateActivity, IMPACT_LABELS, STATUS_LABELS, type Activity, type ActivityStatus } from "@/hooks/useActivities";
import { useSprints } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { CreateActivityModal } from "@/components/metas/CreateActivityModal";
import { useCoordinatorTasks } from "@/hooks/useCoordinatorTasks";

const STATUS_STYLES: Record<ActivityStatus, string> = {
  todo: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  blocked: "bg-red-500/15 text-red-700 border-red-500/30",
  done: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const STATUS_BAR: Record<ActivityStatus, string> = {
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  blocked: "bg-red-500",
  done: "bg-emerald-500",
};

interface Props {
  productIds: string[] | null;
  createOpen?: boolean;
  onCreateOpenChange?: (o: boolean) => void;
}

export function AtividadesTab({ productIds, createOpen, onCreateOpenChange }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: members = [] } = useTeamMembers();
  const { data: activities = [] } = useActivities(productIds);
  const { data: allTasks = [] } = useCoordinatorTasks(productIds);
  const updateActivity = useUpdateActivity();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = createOpen ?? internalOpen;
  const setOpen = onCreateOpenChange ?? setInternalOpen;
  const [editing, setEditing] = useState<Activity | null>(null);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  const sorted = useMemo(
    () => [...activities].filter((a) => !a.parent_id).sort((a, b) => {
      const da = a.deadline_date ?? "9999-12-31";
      const db = b.deadline_date ?? "9999-12-31";
      return da.localeCompare(db);
    }),
    [activities]
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (a.parent_id) {
        const arr = map.get(a.parent_id) ?? [];
        arr.push(a);
        map.set(a.parent_id, arr);
      }
    }
    return map;
  }, [activities]);
  const linked = sorted.filter((a) => !!a.sprint_id);
  const unlinked = sorted.filter((a) => !a.sprint_id);

  const sprintName = (id: string | null) => (id ? sprints.find((s) => s.id === id)?.name ?? "—" : "—");
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const productColor = (id: string) => products.find((p) => p.id === id)?.color ?? "hsl(var(--muted))";
  const memberLabel = (a: Activity) => {
    const ids = a.responsible_ids?.length ? a.responsible_ids : (a.responsible_id ? [a.responsible_id] : []);
    if (!ids.length) return "Não atribuído";
    return ids.map((id) => members.find((m) => m.id === id)?.name ?? "—").join(", ");
  };

  const deadlineInfo = (a: Activity) => {
    if (!a.deadline_date) return { label: "Sem prazo", tone: "muted", days: null as number | null };
    try {
      const d = parseISO(a.deadline_date);
      const days = differenceInCalendarDays(d, new Date());
      const dateLabel = format(d, "dd MMM", { locale: ptBR });
      if (a.status === "done") return { label: dateLabel, tone: "muted", days };
      if (days < 0) return { label: `${dateLabel} · atrasada ${Math.abs(days)}d`, tone: "danger", days };
      if (days === 0) return { label: `${dateLabel} · hoje`, tone: "danger", days };
      if (days <= 3) return { label: `${dateLabel} · ${days}d`, tone: "warning", days };
      if (days <= 7) return { label: `${dateLabel} · ${days}d`, tone: "info", days };
      return { label: dateLabel, tone: "muted", days };
    } catch {
      return { label: a.deadline_date ?? "—", tone: "muted", days: null };
    }
  };

  const renderActivity = (a: Activity) => {
    const dl = deadlineInfo(a);
    const dlClass = {
      danger: "text-red-700 bg-red-500/10 border-red-500/30",
      warning: "text-amber-700 bg-amber-500/10 border-amber-500/30",
      info: "text-blue-700 bg-blue-500/10 border-blue-500/30",
      muted: "text-muted-foreground bg-muted/40 border-border",
    }[dl.tone];
    const linkedTasks = allTasks.filter((t) => t.activity_id === a.id);
    return (
      <Card
        key={a.id}
        className="relative p-0 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all overflow-hidden group"
        onClick={() => setEditing(a)}
      >
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", STATUS_BAR[a.status])} />
        <div className="p-4 pl-5 space-y-3">
          {/* Top: status + impact */}
          <div className="flex items-center justify-between gap-2">
            <Badge className={cn("text-[10px] border h-5 px-2", STATUS_STYLES[a.status])} variant="outline">
              {STATUS_LABELS[a.status]}
            </Badge>
            <div className="flex items-center gap-1.5">
              {linkedTasks.length > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-primary/10 text-primary border-primary/30">
                  <ListTodo className="w-3 h-3" /> {linkedTasks.length}
                </Badge>
              )}
              {a.impact === "critical" ? (
                <Badge className="bg-red-500 text-white border-0 h-5 px-2 text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" /> Crítico
                </Badge>
              ) : (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {IMPACT_LABELS[a.impact]}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {a.task}
          </h3>

          {/* Description */}
          {a.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.description}</p>
          )}

          {/* Deadline highlight */}
          <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium rounded-md border px-2 py-1", dlClass)}>
            <Calendar className="w-3 h-3" />
            {dl.label}
          </div>

            {a.status !== "done" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-7 gap-1.5 text-[11px] border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-300"
                onClick={(e) => {
                  e.stopPropagation();
                  updateActivity.mutate({ id: a.id, status: "done" } as any);
                }}
              >
                <CheckCircle2 className="w-3 h-3" /> Concluir
              </Button>
            )}

          {/* Meta footer */}
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: productColor(a.product_id) }}
              />
              <span className="font-medium text-foreground truncate">{productName(a.product_id)}</span>
              {a.sprint_id && (
                <span className="text-muted-foreground truncate">· {sprintName(a.sprint_id)}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{memberLabel(a)}</span>
              </span>
              {a.dependency_id && (
                <span className="flex items-center gap-1 text-amber-600 shrink-0">
                  <Link2 className="w-3 h-3" /> Dep.
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderGrid = (items: Activity[], emptyMsg: string) =>
    items.length ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(renderActivity)}
      </div>
    ) : (
      <Card className="p-8 text-center text-sm text-muted-foreground">{emptyMsg}</Card>
    );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="linked" className="w-full">
        <TabsList>
          <TabsTrigger value="linked">Vinculadas à sprint ({linked.length})</TabsTrigger>
          <TabsTrigger value="unlinked">Sem sprint ({unlinked.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="linked" className="mt-3">
          {renderGrid(linked, "Nenhuma atividade vinculada a sprint.")}
        </TabsContent>
        <TabsContent value="unlinked" className="mt-3">
          {renderGrid(unlinked, "Todas as atividades estão vinculadas a sprints.")}
        </TabsContent>
      </Tabs>

      <CreateActivityModal
        open={open}
        onOpenChange={setOpen}
        products={visibleProducts}
        sprints={sprints}
        activities={activities}
      />
      <CreateActivityModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        products={visibleProducts}
        sprints={sprints}
        activities={activities}
        editing={editing}
      />
    </div>
  );
}