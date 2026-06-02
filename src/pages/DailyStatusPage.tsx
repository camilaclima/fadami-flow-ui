import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Plus, AlertTriangle, ShieldCheck, Flame, Loader2, UsersRound, Crown, Package, ChevronRight, Settings, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useActiveSquads, type Squad } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { SquadFormModal } from "@/components/squads/SquadFormModal";
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
  const { data: allSquads = [], isLoading: squadsLoading } = useActiveSquads();
  const { data: profiles = [] } = useProfiles();
  const { isAdmin, productIds: allowedIds } = useAuthorizedProducts();
  const [openSquadDialog, setOpenSquadDialog] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);

  // Aplica trava por vínculo: admin vê tudo; demais veem apenas produtos vinculados.
  const products = useMemo(
    () => isAdmin || !allowedIds ? allProducts : allProducts.filter((p) => allowedIds.includes(p.id)),
    [allProducts, allowedIds, isAdmin],
  );
  // Squad só aparece se possuir ao menos um produto autorizado para o usuário.
  const squads = useMemo(() => {
    if (isAdmin || !allowedIds) return allSquads;
    return allSquads.filter((s) => s.product_ids.some((pid) => allowedIds.includes(pid)));
  }, [allSquads, allowedIds, isAdmin]);

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

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const dailiesByProduct = useMemo(() => Object.fromEntries(projectCards.map((c) => [c.productId, c])), [projectCards]);

  // Aggregate insights per product for quick metrics on the squad cards
  const insightsByProduct = useMemo(() => {
    const map = new Map<string, { gargalos: number; avancos: number }>();
    for (const d of allDailies) {
      const cur = map.get(d.product_id) ?? { gargalos: 0, avancos: 0 };
      cur.gargalos += d.ai_insights?.recorrencias?.length ?? 0;
      cur.avancos += (d.ai_insights?.avancos?.length ?? 0) + (d.ai_insights?.avancos_consolidados?.length ?? 0);
      map.set(d.product_id, cur);
    }
    return map;
  }, [allDailies]);

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6 max-w-7xl mx-auto"}>
      {embedded ? (
        <div className="flex justify-end">
          <Button onClick={() => setOpenSquadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Squad
          </Button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Saúde do Projeto</h1>
              <p className="text-sm text-muted-foreground">Dashboard evolutivo organizado por Squads e seus produtos.</p>
            </div>
          </div>
          <Button onClick={() => setOpenSquadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Squad
          </Button>
        </motion.div>
      )}

      {(isLoading || squadsLoading) ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : squads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <UsersRound className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma squad cadastrada ainda. Crie a primeira para começar a registrar dailys.</p>
            <Button onClick={() => setOpenSquadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Squad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squads.map((squad) => {
            const leader = squad.leader_profile_id ? profileMap[squad.leader_profile_id] : null;
            const squadProducts = squad.product_ids.map((pid) => productMap[pid]).filter(Boolean);
            const totalDailies = squadProducts.reduce((sum, p) => sum + (dailiesByProduct[p.id]?.count ?? 0), 0);
            // worst status across all products of the squad
            const worstLevel = squadProducts.reduce((max, p) => {
              const lvl = dailiesByProduct[p.id]?.latest.blocker_level ?? 0;
              return Math.max(max, lvl);
            }, 0);
            const status = worstLevel > 0 ? statusFromBlocker(worstLevel) : null;
            const StatusIcon = status?.icon;
            const totalGargalos = squadProducts.reduce((s, p) => s + (insightsByProduct.get(p.id)?.gargalos ?? 0), 0);
            const totalAvancos = squadProducts.reduce((s, p) => s + (insightsByProduct.get(p.id)?.avancos ?? 0), 0);
            return (
              <motion.div key={squad.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md group h-full"
                  onClick={() => navigate(`/daily-status/squad/${squad.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                          <UsersRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                            {squad.name}
                          </CardTitle>
                          {squad.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{squad.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {status && StatusIcon && (
                          <Badge className={cn("border text-[10px]", status.cls)}>
                            <StatusIcon className="h-3 w-3 mr-1" /> {status.label}
                          </Badge>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Configurar squad"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); setEditingSquad(squad); }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Crown className="h-3 w-3 text-amber-500" />
                        {leader ? `${leader.first_name} ${leader.last_name}` : "Sem líder"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <UsersRound className="h-3 w-3" />
                        {squad.member_ids.length} membro{squad.member_ids.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {totalDailies} daily{totalDailies === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
                        <TrendingUp className="h-3 w-3" /> {totalAvancos} avanço{totalAvancos === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1 border-red-500/40 text-red-700 bg-red-500/10">
                        <Flame className="h-3 w-3" /> {totalGargalos} gargalo{totalGargalos === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Package className="h-3 w-3" /> Produtos ({squadProducts.length})
                      </div>
                      {squadProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhum produto vinculado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {squadProducts.map((p) => (
                            <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* key força unmount/remount entre aberturas, garantindo estado 100% limpo
          ao abrir "Nova Squad" depois de salvar/editar outra. */}
      {openSquadDialog && (
        <SquadFormModal
          key={`new-${openSquadDialog}`}
          open={openSquadDialog}
          onOpenChange={setOpenSquadDialog}
        />
      )}
      {editingSquad && (
        <SquadFormModal
          key={`edit-${editingSquad.id}`}
          open={!!editingSquad}
          onOpenChange={(o) => !o && setEditingSquad(null)}
          squad={editingSquad}
        />
      )}
    </div>
  );
}
