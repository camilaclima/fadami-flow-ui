import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivities, STATUS_LABELS } from "@/hooks/useActivities";
import { useSprints } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface Props {
  productIds: string[] | null;
}

export function CronogramaTab({ productIds }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: activities = [] } = useActivities(productIds);
  const { data: members = [] } = useTeamMembers();

  const today = new Date().toISOString().slice(0, 10);

  const visibleProducts = useMemo(() => {
    let list = productIds ? products.filter((p) => productIds.includes(p.id)) : products;
    return list;
  }, [products, productIds]);

  const depTitle = (id: string | null) => (id ? activities.find((a) => a.id === id)?.task ?? "—" : "");
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "—" : "—");

  return (
    <div className="space-y-3">
      {visibleProducts.map((prod) => {
        const prodSprints = sprints.filter((s) => s.product_id === prod.id);
        const prodActivities = activities.filter((a) => a.product_id === prod.id);
        return (
          <Collapsible key={prod.id} defaultOpen>
            <Card className="p-3">
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
                <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
                <span className="w-2 h-2 rounded-full" style={{ background: prod.color }} />
                <span className="font-semibold">{prod.name}</span>
                <Badge variant="outline" className="ml-auto">{prodActivities.length} ativ.</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2 pl-6">
                {prodSprints.map((s) => {
                  const acts = prodActivities.filter((a) => a.sprint_id === s.id);
                  return (
                    <Collapsible key={s.id} defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group text-sm">
                        <ChevronRight className="w-3 h-3 transition-transform group-data-[state=open]:rotate-90" />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">({s.start_date} → {s.end_date})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-5 mt-1 space-y-1">
                        {acts.length === 0 && <p className="text-xs text-muted-foreground">Sem atividades.</p>}
                        {acts.map((a) => {
                          const overdue = a.deadline_date && a.deadline_date < today && a.status !== "done";
                          return (
                            <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                              <span className="flex-1 truncate">{a.task}</span>
                              {a.dependency_id && (
                                <span title={`Depende de: ${depTitle(a.dependency_id)}`} className="text-amber-600">
                                  <Link2 className="w-3 h-3" />
                                </span>
                              )}
                              <span className="text-muted-foreground">{memberName(a.responsible_id)}</span>
                              <span className={cn("font-mono", overdue && "text-red-500 font-semibold")}>{a.deadline_date ?? "—"}</span>
                              <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[a.status]}</Badge>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group text-sm">
                    <ChevronRight className="w-3 h-3 transition-transform group-data-[state=open]:rotate-90" />
                    <span className="font-medium text-muted-foreground">Backlog (sem sprint)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-5 mt-1 space-y-1">
                    {prodActivities.filter((a) => !a.sprint_id).map((a) => {
                      const overdue = a.deadline_date && a.deadline_date < today && a.status !== "done";
                      return (
                        <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                          <span className="flex-1 truncate">{a.task}</span>
                          {a.dependency_id && (
                            <span title={`Depende de: ${depTitle(a.dependency_id)}`} className="text-amber-600">
                              <Link2 className="w-3 h-3" />
                            </span>
                          )}
                          <span className="text-muted-foreground">{memberName(a.responsible_id)}</span>
                          <span className={cn("font-mono", overdue && "text-red-500 font-semibold")}>{a.deadline_date ?? "—"}</span>
                          <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[a.status]}</Badge>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
      {visibleProducts.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum projeto disponível.</Card>
      )}
    </div>
  );
}