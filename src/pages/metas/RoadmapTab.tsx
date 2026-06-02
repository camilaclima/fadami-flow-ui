import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";

type Granularity = "week" | "month" | "quarter";

function periodKey(date: string, g: Granularity): string {
  const d = new Date(date);
  if (g === "week") {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((+d - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-S${String(wk).padStart(2, "0")}`;
  }
  if (g === "quarter") return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  productIds: string[] | null;
  selectedProductId: string | null;
}

export function RoadmapTab({ productIds, selectedProductId }: Props) {
  const { data: products = [] } = useProducts();
  const { data: activities = [] } = useActivities(productIds);
  const [granularity, setGranularity] = useState<Granularity>("month");

  const filtered = useMemo(
    () => activities.filter((a) => a.deadline_date && (!selectedProductId || a.product_id === selectedProductId)),
    [activities, selectedProductId]
  );

  const periods = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((a) => set.add(periodKey(a.deadline_date!, granularity)));
    return Array.from(set).sort();
  }, [filtered, granularity]);

  const visibleProducts = useMemo(() => {
    let list = productIds ? products.filter((p) => productIds.includes(p.id)) : products;
    if (selectedProductId) list = list.filter((p) => p.id === selectedProductId);
    return list;
  }, [products, productIds, selectedProductId]);

  const depTitle = (id: string | null) => (id ? activities.find((a) => a.id === id)?.task ?? "—" : "");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanas</SelectItem>
            <SelectItem value="month">Meses</SelectItem>
            <SelectItem value="quarter">Trimestres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4 overflow-x-auto">
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade com prazo definido.</p>
        ) : (
          <div className="min-w-[720px]">
            <div
              className="grid sticky top-0 bg-background z-10 border-b border-border"
              style={{ gridTemplateColumns: `180px repeat(${periods.length}, minmax(160px, 1fr))` }}
            >
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">Projeto</div>
              {periods.map((p) => (
                <div key={p} className="px-2 py-2 text-xs font-semibold text-center text-muted-foreground border-l border-border/60">
                  {p}
                </div>
              ))}
            </div>
            {visibleProducts.map((prod, rowIdx) => (
              <div
                key={prod.id}
                className={`grid items-start ${rowIdx % 2 === 0 ? "bg-muted/10" : ""}`}
                style={{ gridTemplateColumns: `180px repeat(${periods.length}, minmax(160px, 1fr))` }}
              >
                <div className="px-2 py-3 text-xs font-semibold flex items-center gap-2 border-b border-border/40">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: prod.color }} />
                  <span className="truncate">{prod.name}</span>
                </div>
                {periods.map((p) => {
                  const blocks = filtered.filter((a) => a.product_id === prod.id && periodKey(a.deadline_date!, granularity) === p);
                  return (
                    <div key={p} className="px-1.5 py-2 space-y-1 min-h-[56px] border-l border-b border-border/40">
                      {blocks.map((b) => (
                        <div
                          key={b.id}
                          className="text-[11px] px-2 py-1.5 rounded-md border shadow-sm"
                          style={{ borderColor: prod.color, background: `${prod.color}1A` }}
                        >
                          <p className="truncate font-medium">{b.task}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {b.impact === "critical" && (
                              <Badge className="bg-red-500 text-white text-[9px] animate-pulse border-0">Crítico</Badge>
                            )}
                            {b.dependency_id && (
                              <span className="flex items-center gap-0.5 text-amber-600 text-[10px]">
                                <Link2 className="w-2.5 h-2.5" /> dep
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}