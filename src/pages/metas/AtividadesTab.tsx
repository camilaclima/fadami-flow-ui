import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}

export function AtividadesTab({ productIds }: Props) {
  const { data: products = [] } = useProducts();
  const { data: sprints = [] } = useSprints();
  const { data: members = [] } = useTeamMembers();
  const { data: activities = [] } = useActivities(productIds);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );

  const sorted = useMemo(
    () => [...activities].sort((a, b) => {
      const da = a.deadline_date ?? "9999-12-31";
      const db = b.deadline_date ?? "9999-12-31";
      return da.localeCompare(db);
    }),
    [activities]
  );
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

  const renderActivity = (a: Activity) => (
    <Card key={a.id} className="p-3 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditing(a)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{a.task}</p>
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: productColor(a.product_id) }} />
              {productName(a.product_id)}
            </Badge>
            {a.impact === "critical" ? (
              <Badge className="bg-red-500 text-white animate-pulse border-0">Crítico</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">{IMPACT_LABELS[a.impact]}</Badge>
            )}
            {a.sprint_id ? (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/40">Sprint: {sprintName(a.sprint_id)}</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Sem sprint</Badge>
            )}
            {a.dependency_id && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                <Link2 className="w-3 h-3" /> Dependência
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{memberLabel(a)}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline_date ?? "—"}</span>
          </div>
          {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
        </div>
        <Badge className={cn("text-[10px] border", STATUS_STYLES[a.status])} variant="outline">{STATUS_LABELS[a.status]}</Badge>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Criar Atividade
        </Button>
      </div>

      <Tabs defaultValue="linked" className="w-full">
        <TabsList>
          <TabsTrigger value="linked">Vinculadas à sprint ({linked.length})</TabsTrigger>
          <TabsTrigger value="unlinked">Sem sprint ({unlinked.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="linked" className="mt-3 space-y-2">
          {linked.length ? linked.map(renderActivity) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma atividade vinculada a sprint.</Card>
          )}
        </TabsContent>
        <TabsContent value="unlinked" className="mt-3 space-y-2">
          {unlinked.length ? unlinked.map(renderActivity) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Todas as atividades estão vinculadas a sprints.</Card>
          )}
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