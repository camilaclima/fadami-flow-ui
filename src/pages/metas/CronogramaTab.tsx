import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Link2, Calendar, User2, AlertTriangle, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivities, STATUS_LABELS, type Activity, type ActivityStatus } from "@/hooks/useActivities";
import { useSprints } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { CreateActivityModal } from "@/components/metas/CreateActivityModal";

interface Props {
  productIds: string[] | null;
}

const STATUS_DOT: Record<ActivityStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-amber-500",
  blocked: "bg-red-500",
  done: "bg-emerald-500",
};

const STATUS_ICON: Record<ActivityStatus, React.ComponentType<{ className?: string }>> = {
  todo: Circle,
  in_progress: PlayCircle,
  blocked: AlertTriangle,
  done: CheckCircle2,
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

export function CronogramaTab({ productIds }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: activities = [] } = useActivities(productIds);
  const { data: members = [] } = useTeamMembers();
  const [editing, setEditing] = useState<Activity | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const visibleProducts = useMemo(() => {
    let list = productIds ? products.filter((p) => productIds.includes(p.id)) : products;
    return list;
  }, [products, productIds]);

  const depTitle = (id: string | null) => (id ? activities.find((a) => a.id === id)?.task ?? "—" : "");
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "—" : "—");
  const memberLabel = (a: Activity) => {
    const ids = a.responsible_ids?.length ? a.responsible_ids : (a.responsible_id ? [a.responsible_id] : []);
    if (!ids.length) return "Não atribuído";
    return ids.map((id) => memberName(id)).join(", ");
  };

  const renderRow = (a: Activity) => {
    const overdue = a.deadline_date && a.deadline_date < today && a.status !== "done";
    const Icon = STATUS_ICON[a.status];
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => setEditing(a)}
        className={cn(
          "group w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          "hover:bg-muted/60 border border-transparent hover:border-border",
        )}
      >
        <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[a.status])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{a.task}</span>
            {a.dependency_id && (
              <span title={`Depende de: ${depTitle(a.dependency_id)}`} className="text-amber-600 shrink-0">
                <Link2 className="w-3 h-3" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 truncate"><User2 className="w-3 h-3" /> {memberLabel(a)}</span>
            <span className={cn("flex items-center gap-1", overdue && "text-red-500 font-semibold")}>
              <Calendar className="w-3 h-3" /> {formatDate(a.deadline_date)}
              {overdue && <span className="ml-1">• atrasada</span>}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
          <Icon className="w-3 h-3" /> {STATUS_LABELS[a.status]}
        </Badge>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {visibleProducts.map((prod) => {
        const prodSprints = sprints.filter((s) => s.product_id === prod.id);
        const prodActivities = activities.filter((a) => a.product_id === prod.id);
        const total = prodActivities.length;
        const done = prodActivities.filter((a) => a.status === "done").length;
        const overdue = prodActivities.filter((a) => a.deadline_date && a.deadline_date < today && a.status !== "done").length;
        const blocked = prodActivities.filter((a) => a.status === "blocked").length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const backlog = prodActivities.filter((a) => !a.sprint_id);

        return (
          <Collapsible key={prod.id} defaultOpen>
            <Card className="overflow-hidden">
              {/* Header do projeto */}
              <div className="flex items-stretch">
                <span className="w-1.5 shrink-0" style={{ background: prod.color }} />
                <CollapsibleTrigger className="flex-1 flex items-center gap-3 text-left group px-4 py-3 hover:bg-muted/40 transition-colors">
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{prod.name}</span>
                      <Badge variant="outline" className="text-[10px]">{total} atividades</Badge>
                      {overdue > 0 && (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" /> {overdue} atrasadas
                        </Badge>
                      )}
                      {blocked > 0 && (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                          {blocked} bloqueadas
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 max-w-xs h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{done}/{total} • {pct}%</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                  {prodSprints.map((s) => {
                    const acts = prodActivities.filter((a) => a.sprint_id === s.id);
                    const sDone = acts.filter((a) => a.status === "done").length;
                    return (
                      <Collapsible key={s.id} defaultOpen>
                        <div className="rounded-lg border border-border bg-card">
                          <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 group hover:bg-muted/40 rounded-t-lg">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                            <span className="font-medium text-sm">{s.name}</span>
                            <Badge variant="outline" className="text-[10px] ml-1">{acts.length}</Badge>
                            <span className="ml-auto text-[11px] text-muted-foreground">
                              {formatDate(s.start_date)} → {formatDate(s.end_date)}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">{sDone}/{acts.length}</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-2 pb-2 pt-1 space-y-0.5">
                            {acts.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-3 py-2">Sem atividades nesta sprint.</p>
                            ) : acts.map(renderRow)}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}

                  {backlog.length > 0 && (
                    <Collapsible defaultOpen>
                      <div className="rounded-lg border border-dashed border-border bg-card/50">
                        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 group hover:bg-muted/40 rounded-t-lg">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                          <span className="font-medium text-sm text-muted-foreground">Backlog (sem sprint)</span>
                          <Badge variant="outline" className="text-[10px] ml-1">{backlog.length}</Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-2 pb-2 pt-1 space-y-0.5">
                          {backlog.map(renderRow)}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {prodSprints.length === 0 && backlog.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">Sem atividades cadastradas.</p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
      {visibleProducts.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum projeto disponível.</Card>
      )}

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