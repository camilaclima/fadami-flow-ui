import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useSprints } from "@/hooks/useSprints";
import { useActivities } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { SPRINT_STATUS_LABELS, type Sprint } from "@/types/sprint";
import { CreateSprintModal } from "@/components/metas/CreateSprintModal";
import { SprintDetailDrawer } from "@/components/metas/SprintDetailDrawer";

interface Props {
  productIds: string[] | null;
  selectedProductId: string | null;
}

export function SprintsTab({ productIds, selectedProductId }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: activities = [] } = useActivities(productIds);
  const { data: sprintProducts = [] } = useSprintProducts();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Sprint | null>(null);

  const visibleSprints = useMemo(() => {
    const sprintToProds = new Map<string, string[]>();
    sprintProducts.forEach((sp) => {
      if (!sprintToProds.has(sp.sprint_id)) sprintToProds.set(sp.sprint_id, []);
      sprintToProds.get(sp.sprint_id)!.push(sp.product_id);
    });
    const prodIdsFor = (s: Sprint) => sprintToProds.get(s.id) ?? (s.product_id ? [s.product_id] : []);
    let list = sprints;
    if (productIds) list = list.filter((s) => prodIdsFor(s).some((pid) => productIds.includes(pid)));
    if (selectedProductId) list = list.filter((s) => prodIdsFor(s).includes(selectedProductId));
    return list;
  }, [sprints, sprintProducts, productIds, selectedProductId]);

  const unassigned = useMemo(() => activities.filter((a) => !a.sprint_id), [activities]);
  const sprintActivities = (sid: string) => activities.filter((a) => a.sprint_id === sid);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Criar Sprint
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleSprints.map((s) => {
          const acts = sprintActivities(s.id);
          const done = acts.filter((a) => a.status === "done").length;
          const blocked = acts.filter((a) => a.status === "blocked").length;
          return (
            <Card key={s.id} className="p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(s)}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="outline">{SPRINT_STATUS_LABELS[s.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.start_date} → {s.end_date}</p>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <Badge variant="secondary">{acts.length} ativ.</Badge>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">{done} concluídas</Badge>
                {blocked > 0 && <Badge variant="outline" className="text-red-600 border-red-500/30">{blocked} impedidas</Badge>}
              </div>
            </Card>
          );
        })}
        {visibleSprints.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground col-span-full">Nenhuma sprint criada ainda.</Card>
        )}
      </div>

      <CreateSprintModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={visibleProducts}
        unassignedActivities={unassigned}
        defaultProductId={selectedProductId}
      />
      <SprintDetailDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        sprint={selected}
        activities={selected ? sprintActivities(selected.id) : []}
        allActivities={activities}
        sprints={sprints}
        products={visibleProducts}
      />
    </div>
  );
}