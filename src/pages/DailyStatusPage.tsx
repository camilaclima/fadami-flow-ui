import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Plus, Sparkles, AlertTriangle, ShieldCheck, Flame, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { NewDailyDialog } from "@/components/daily/NewDailyDialog";

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

export default function DailyStatusPage() {
  const navigate = useNavigate();
  const { data: products = [] } = useActiveProducts();
  const [openDialog, setOpenDialog] = useState(false);

  const { data: allDailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*")
        .order("status_date", { ascending: false });
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const projectCards = useMemo(() => {
    const byProduct = new Map<string, DailyRow[]>();
    for (const d of allDailies) {
      if (!d.product_id) continue;
      if (!byProduct.has(d.product_id)) byProduct.set(d.product_id, []);
      byProduct.get(d.product_id)!.push(d);
    }
    return Array.from(byProduct.entries()).map(([productId, dailies]) => {
      const product = products.find((p) => p.id === productId);
      const latest = dailies[0];
      return { productId, productName: product?.name ?? "Projeto", productColor: product?.color, latest, count: dailies.length };
    });
  }, [allDailies, products]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Status Diário</h1>
            <p className="text-sm text-muted-foreground">Dashboard inteligente das dailys por projeto.</p>
          </div>
        </div>
        <Button onClick={() => setOpenDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Daily
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : projectCards.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma daily registrada ainda.</p>
            <Button onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Registrar primeira daily
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectCards.map((p) => {
            const status = statusFromBlocker(p.latest.blocker_level);
            const Icon = status.icon;
            const aiSummary = p.latest.ai_insights?.resumo_executivo ?? "Sem insight gerado ainda.";
            return (
              <motion.div key={p.productId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="cursor-pointer hover:border-primary/50 transition-all group h-full"
                  onClick={() => navigate(`/daily-status/${p.productId}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: p.productColor ?? "hsl(var(--primary))" }} />
                        <CardTitle className="text-base truncate group-hover:text-primary transition-colors">{p.productName}</CardTitle>
                      </div>
                      <Badge className={cn("border flex-shrink-0", status.cls)}>
                        <Icon className="h-3 w-3 mr-1" /> {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3 italic">"{aiSummary}"</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                      <span>{p.count} daily{p.count > 1 ? "s" : ""}</span>
                      <span>Última: {format(new Date(p.latest.status_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewDailyDialog open={openDialog} onOpenChange={setOpenDialog} />
    </div>
  );
}
