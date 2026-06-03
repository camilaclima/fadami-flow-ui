import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";
import { useActivities, type Activity } from "@/hooks/useActivities";
import { useProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { CreateActivityModal } from "@/components/metas/CreateActivityModal";

type Granularity = "week" | "month" | "quarter";

/** Group key (top header) and sub key (sub-division) for an activity date. */
function getGroupAndSub(date: string, g: Granularity): { group: string; groupLabel: string; sub: string; subLabel: string } {
  const d = new Date(date + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const dow = d.getDay(); // 0=Sun..6=Sat
  if (g === "week") {
    // Group by ISO week (Mon start). Sub-divide by weekday (Mon-Fri).
    const monday = new Date(d);
    const diff = (dow === 0 ? -6 : 1 - dow);
    monday.setDate(d.getDate() + diff);
    const groupKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const groupLabel = `Sem. ${monday.getDate()}/${monday.getMonth() + 1}`;
    const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    return { group: groupKey, groupLabel, sub: String(dow), subLabel: dayNames[dow] };
  }
  if (g === "quarter") {
    const q = Math.floor(m / 3) + 1;
    return {
      group: `${y}-Q${q}`,
      groupLabel: `${y} Q${q}`,
      sub: String(m),
      subLabel: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m],
    };
  }
  // month: sub-divide by week-of-month
  const wom = Math.ceil((day + new Date(y, m, 1).getDay()) / 7);
  const monthLabel = `${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m]}/${y}`;
  return { group: `${y}-${String(m + 1).padStart(2, "0")}`, groupLabel: monthLabel, sub: `w${wom}`, subLabel: `S${wom}` };
}

function subsForGranularity(g: Granularity): { sub: string; subLabel: string }[] {
  if (g === "week") return [
    { sub: "1", subLabel: "SEG" }, { sub: "2", subLabel: "TER" }, { sub: "3", subLabel: "QUA" },
    { sub: "4", subLabel: "QUI" }, { sub: "5", subLabel: "SEX" },
  ];
  if (g === "quarter") return Array.from({ length: 3 }).map((_, i) => ({ sub: "", subLabel: "" })); // placeholder, will be derived per group
  return [
    { sub: "w1", subLabel: "S1" }, { sub: "w2", subLabel: "S2" }, { sub: "w3", subLabel: "S3" },
    { sub: "w4", subLabel: "S4" }, { sub: "w5", subLabel: "S5" },
  ];
}

interface Props {
  productIds: string[] | null;
}

export function RoadmapTab({ productIds }: Props) {
  const { data: products = [] } = useProducts();
  const { data: activities = [] } = useActivities(productIds);
  const { data: sprints = [] } = useSprints();
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [editing, setEditing] = useState<Activity | null>(null);

  const filtered = useMemo(
    () => activities.filter((a) => a.deadline_date),
    [activities]
  );

  // Build groups -> ordered list of subs (each "cell" = group+sub)
  const { groups, cells } = useMemo(() => {
    const groupMap = new Map<string, { label: string; subs: Map<string, string> }>();
    filtered.forEach((a) => {
      const info = getGroupAndSub(a.deadline_date!, granularity);
      if (!groupMap.has(info.group)) groupMap.set(info.group, { label: info.groupLabel, subs: new Map() });
      groupMap.get(info.group)!.subs.set(info.sub, info.subLabel);
    });
    // Ensure each group has the full set of subs for stable columns
    const groupArr = Array.from(groupMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
      let fixedSubs: { sub: string; subLabel: string }[];
      if (granularity === "week") fixedSubs = subsForGranularity("week");
      else if (granularity === "month") fixedSubs = subsForGranularity("month");
      else {
        // quarter: build 3 months of the quarter
        const [y, qStr] = k.split("-Q");
        const startM = (parseInt(qStr) - 1) * 3;
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        fixedSubs = [0, 1, 2].map((i) => ({ sub: String(startM + i), subLabel: monthNames[startM + i] }));
      }
      return { key: k, label: v.label, subs: fixedSubs };
    });
    const cellList: { group: string; sub: string; label: string }[] = [];
    groupArr.forEach((g) => g.subs.forEach((s) => cellList.push({ group: g.key, sub: s.sub, label: s.subLabel })));
    return { groups: groupArr, cells: cellList };
  }, [filtered, granularity]);

  const visibleProducts = useMemo(() => {
    return productIds ? products.filter((p) => productIds.includes(p.id)) : products;
  }, [products, productIds]);

  const COL = "minmax(110px, 1fr)";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanas (dias)</SelectItem>
            <SelectItem value="month">Meses (semanas)</SelectItem>
            <SelectItem value="quarter">Trimestres (meses)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4 overflow-x-auto">
        {cells.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade com prazo definido.</p>
        ) : (
          <div className="min-w-[720px]">
            {/* Top header: groups */}
            <div
              className="grid sticky top-0 bg-background z-10"
              style={{ gridTemplateColumns: `180px ${groups.map((g) => `repeat(${g.subs.length}, ${COL})`).join(" ")}` }}
            >
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">Projeto</div>
              {groups.map((g) => (
                <div
                  key={g.key}
                  className="px-2 py-2 text-xs font-bold text-center text-foreground border-l-2 border-primary/30 bg-muted/30"
                  style={{ gridColumn: `span ${g.subs.length}` }}
                >
                  {g.label}
                </div>
              ))}
            </div>
            {/* Sub-header: subdivisions */}
            <div
              className="grid border-b border-border bg-background"
              style={{ gridTemplateColumns: `180px ${groups.map((g) => `repeat(${g.subs.length}, ${COL})`).join(" ")}` }}
            >
              <div />
              {cells.map((c, i) => {
                const isGroupStart = i === 0 || cells[i - 1].group !== c.group;
                return (
                  <div
                    key={`${c.group}-${c.sub}-${i}`}
                    className={`px-1 py-1 text-[10px] font-medium text-center text-muted-foreground border-b ${isGroupStart ? "border-l-2 border-l-primary/30" : "border-l border-border/40"}`}
                  >
                    {c.label}
                  </div>
                );
              })}
            </div>
            {visibleProducts.map((prod, rowIdx) => (
              <div
                key={prod.id}
                className={`grid items-start ${rowIdx % 2 === 0 ? "bg-muted/10" : ""}`}
                style={{ gridTemplateColumns: `180px ${groups.map((g) => `repeat(${g.subs.length}, ${COL})`).join(" ")}` }}
              >
                <div className="px-2 py-3 text-xs font-semibold flex items-center gap-2 border-b border-border/40">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: prod.color }} />
                  <span className="truncate">{prod.name}</span>
                </div>
                {cells.map((c, i) => {
                  const isGroupStart = i === 0 || cells[i - 1].group !== c.group;
                  const blocks = filtered.filter((a) => {
                    if (a.product_id !== prod.id) return false;
                    const info = getGroupAndSub(a.deadline_date!, granularity);
                    return info.group === c.group && info.sub === c.sub;
                  });
                  return (
                    <div key={`${prod.id}-${c.group}-${c.sub}-${i}`} className={`px-1.5 py-2 space-y-1 min-h-[56px] border-b border-border/40 ${isGroupStart ? "border-l-2 border-l-primary/30" : "border-l border-border/40"}`}>
                      {blocks.map((b) => (
                        <div
                          key={b.id}
                          className="text-[11px] px-2 py-1.5 rounded-md border shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition"
                          style={{ borderColor: prod.color, background: `${prod.color}1A` }}
                          onClick={() => setEditing(b)}
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