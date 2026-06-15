import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSprints } from "@/hooks/useSprints";
import { useActivities } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { SPRINT_STATUS_LABELS, type Sprint } from "@/types/sprint";
import { cn } from "@/lib/utils";
import { CreateSprintModal } from "@/components/metas/CreateSprintModal";
import { SprintDetailDrawer } from "@/components/metas/SprintDetailDrawer";

interface Props {
  productIds: string[] | null;
  createOpen: boolean;
  onCreateOpenChange: (o: boolean) => void;
}

export function SprintsTab({ productIds, createOpen, onCreateOpenChange }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: activities = [] } = useActivities(productIds);
  const { data: sprintProducts = [] } = useSprintProducts();

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
    return list;
  }, [sprints, sprintProducts, productIds]);

  const unassigned = useMemo(() => activities.filter((a) => !a.sprint_id), [activities]);
  const sprintActivities = (sid: string) => activities.filter((a) => a.sprint_id === sid);
  // Inclui também as que pertenceram originalmente à sprint mas foram migradas/desatribuídas
  const sprintAllActivities = (sid: string) => {
    const seen = new Set<string>();
    const out: typeof activities = [];
    for (const a of activities) {
      const belongs = a.sprint_id === sid || (a as any).migrated_from_sprint_id === sid;
      if (belongs && !seen.has(a.id)) { seen.add(a.id); out.push(a); }
    }
    return out;
  };

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  const today = new Date().toISOString().slice(0, 10);
  const getDerivedStatus = (s: Sprint): { label: string; className: string } => {
    if (s.status === "finished") return { label: SPRINT_STATUS_LABELS.finished, className: "bg-muted text-muted-foreground border-border" };
    if (today < s.start_date) return { label: "Planejada", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
    if (today > s.end_date) return { label: "Atrasada", className: "bg-red-500/15 text-red-600 border-red-500/30" };
    return { label: "Em andamento", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleSprints.map((s) => {
          const acts = sprintAllActivities(s.id);
          // Concluída = ativa, ainda nesta sprint e com status done.
          const done = acts.filter(
            (a) => a.status === "done" && (a as any).active !== false && a.sprint_id === s.id,
          ).length;
          const blocked = acts.filter(
            (a) => a.status === "blocked" && (a as any).active !== false && a.sprint_id === s.id,
          ).length;
          const pct = acts.length > 0 ? Math.round((done / acts.length) * 100) : 0;
          const derived = getDerivedStatus(s);
          return (
            <Card key={s.id} className="p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(s)}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="outline" className={cn(derived.className)}>{derived.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.start_date} → {s.end_date}</p>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <Badge variant="secondary">{acts.length} ativ.</Badge>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">{pct}% concluída</Badge>
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
        onOpenChange={onCreateOpenChange}
        products={visibleProducts}
        unassignedActivities={unassigned}
        defaultProductId={null}
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