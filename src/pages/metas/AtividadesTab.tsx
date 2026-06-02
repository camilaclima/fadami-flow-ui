import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivities, IMPACT_LABELS, STATUS_LABELS, type Activity, type ActivityStatus } from "@/hooks/useActivities";
import { useSprints } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { CreateActivityModal } from "@/components/metas/CreateActivityModal";

const STATUS_STYLES: Record<ActivityStatus, string> = {
  todo: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  blocked: "bg-red-500/15 text-red-600 border-red-500/20",
  done: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
};

interface Props {
  productIds: string[] | null;
  selectedProductId: string | null;
}

export function AtividadesTab({ productIds, selectedProductId }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: members = [] } = useTeamMembers();
  const { data: activities = [] } = useActivities(productIds);
  const [open, setOpen] = useState(false);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  const filtered = useMemo(() => {
    let list = activities;
    if (selectedProductId) list = list.filter((a) => a.product_id === selectedProductId);
    return [...list].sort((a, b) => {
      const da = a.deadline_date ?? "9999-12-31";
      const db = b.deadline_date ?? "9999-12-31";
      return da.localeCompare(db);
    });
  }, [activities, selectedProductId]);

  const linked = filtered.filter((a) => a.sprint_id);
  const backlog = filtered.filter((a) => !a.sprint_id);

  const sprintName = (id: string | null) => (id ? sprints.find((s) => s.id === id)?.name ?? "—" : "—");
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "—" : "Não atribuído");

  const renderActivity = (a: Activity) => (
    <Card key={a.id} className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{a.task}</p>
            {a.impact === "critical" ? (
              <Badge className="bg-red-500 text-white animate-pulse border-0">Crítico</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">{IMPACT_LABELS[a.impact]}</Badge>
            )}
            {a.dependency_id && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                <Link2 className="w-3 h-3" /> Dependência
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{memberName(a.responsible_id)}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline_date ?? "—"}</span>
            {a.sprint_id && <span>Sprint: {sprintName(a.sprint_id)}</span>}
          </div>
        </div>
        <Badge className={cn("text-[10px] border", STATUS_STYLES[a.status])} variant="outline">{STATUS_LABELS[a.status]}</Badge>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Criar Atividade
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Atividades Vinculadas a Sprints ({linked.length})</h3>
        <div className="space-y-2">{linked.length ? linked.map(renderActivity) : <p className="text-xs text-muted-foreground">—</p>}</div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Backlog — Sem Sprint Definida ({backlog.length})</h3>
        <div className="space-y-2">{backlog.length ? backlog.map(renderActivity) : <p className="text-xs text-muted-foreground">—</p>}</div>
      </div>

      <CreateActivityModal
        open={open}
        onOpenChange={setOpen}
        products={visibleProducts}
        sprints={sprints}
        activities={activities}
        defaultProductId={selectedProductId}
      />
    </div>
  );
}