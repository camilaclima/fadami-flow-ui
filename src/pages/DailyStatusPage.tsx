import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, AlertTriangle, ShieldCheck, Flame, Loader2, Package, ChevronRight, TrendingUp, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";

interface DailyRow {
  id: string;
  product_id: string;
  sprint_id: string;
  status_date: string;
  blocker_level: number;
  summary: string;
  ai_insights: any;
  created_at: string;
}

function statusFromBlocker(level: number) {
  if (level <= 2) return { label: "Saudável", icon: ShieldCheck, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (level === 3) return { label: "Atenção", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { label: "Crítico", icon: Flame, cls: "bg-red-500/15 text-red-600 border-red-500/30" };
}

export default function DailyStatusPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { data: allProducts = [] } = useActiveProducts();
  const { isAdmin, productIds: allowedIds } = useAuthorizedProducts();

  const products = useMemo(
    () => isAdmin || !allowedIds ? allProducts : allProducts.filter((p) => allowedIds.includes(p.id)),
    [allProducts, allowedIds, isAdmin],
  );

  const { data: allDailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_all", isAdmin ? "admin" : (allowedIds ?? []).join(",")],
    queryFn: async () => {
      let q = (supabase.from("daily_status") as any)
        .select("*")
        .order("status_date", { ascending: false });
      if (!isAdmin && allowedIds) {
        if (allowedIds.length === 0) return [] as DailyRow[];
        q = q.in("product_id", allowedIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const statsByProduct = useMemo(() => {
    const map = new Map<string, { latest?: DailyRow; count: number; gargalos: number; avancos: number }>();
    for (const d of allDailies) {
      if (!d.product_id) continue;
      const cur = map.get(d.product_id) ?? { latest: undefined, count: 0, gargalos: 0, avancos: 0 };
      cur.count += 1;
      if (!cur.latest) cur.latest = d;
      cur.gargalos += d.ai_insights?.recorrencias?.length ?? 0;
      cur.avancos += (d.ai_insights?.avancos?.length ?? 0) + (d.ai_insights?.avancos_consolidados?.length ?? 0);
      map.set(d.product_id, cur);
    }
    return map;
  }, [allDailies]);

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6 max-w-7xl mx-auto"}>
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Saúde do Projeto</h1>
            <p className="text-sm text-muted-foreground">Selecione um projeto para acompanhar suas dailys.</p>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum projeto vinculado ao seu usuário.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const s = statsByProduct.get(p.id);
            const status = s?.latest ? statusFromBlocker(s.latest.blocker_level) : null;
            const StatusIcon = status?.icon;
            const desc = (p.description ?? "").replace(/^\[Cliente:[^\]]+\]\s?/, "");
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md group h-full"
                  onClick={() => navigate(`/daily-status/${p.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${p.color ?? "hsl(var(--primary))"}20` }}>
                          <Briefcase className="h-5 w-5" style={{ color: p.color ?? "hsl(var(--primary))" }} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                            {p.name}
                          </CardTitle>
                          {desc && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{desc}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {status && StatusIcon && (
                          <Badge className={cn("border text-[10px]", status.cls)}>
                            <StatusIcon className="h-3 w-3 mr-1" /> {status.label}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {s?.count ?? 0} daily{(s?.count ?? 0) === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
                        <TrendingUp className="h-3 w-3" /> {s?.avancos ?? 0} avanço{(s?.avancos ?? 0) === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1 border-red-500/40 text-red-700 bg-red-500/10">
                        <Flame className="h-3 w-3" /> {s?.gargalos ?? 0} gargalo{(s?.gargalos ?? 0) === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
