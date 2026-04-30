import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Plus, Sparkles, AlertTriangle, ShieldCheck, Flame, Loader2, Settings, UsersRound, Crown, Package, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useActiveSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { ProjectConfigModal } from "@/components/daily/ProjectConfigModal";
import { SquadFormModal } from "@/components/squads/SquadFormModal";

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
  const { data: squads = [], isLoading: squadsLoading } = useActiveSquads();
  const { data: profiles = [] } = useProfiles();
  const [openSquadDialog, setOpenSquadDialog] = useState(false);
  const [configFor, setConfigFor] = useState<{ id: string; name: string } | null>(null);
  const [expandedSquadId, setExpandedSquadId] = useState<string | null>(null);

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

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const dailiesByProduct = useMemo(() => Object.fromEntries(projectCards.map((c) => [c.productId, c])), [projectCards]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
        <div className="space-y-4">
          {squads.map((squad) => {
            const leader = squad.leader_profile_id ? profileMap[squad.leader_profile_id] : null;
            const squadProducts = squad.product_ids.map((pid) => productMap[pid]).filter(Boolean);
            const expanded = expandedSquadId === squad.id;
            const totalDailies = squadProducts.reduce((sum, p) => sum + (dailiesByProduct[p.id]?.count ?? 0), 0);
            return (
              <motion.div key={squad.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    expanded && "border-primary/60 bg-primary/[0.02]",
                  )}
                  onClick={() => setExpandedSquadId(expanded ? null : squad.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <UsersRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold truncate">{squad.name}</h2>
                        {squad.description && (
                          <p className="text-xs text-muted-foreground truncate">{squad.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Crown className="h-3 w-3 text-amber-500" />
                        {leader ? `${leader.first_name} ${leader.last_name}` : "Sem líder"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <UsersRound className="h-3 w-3" />
                        {squad.member_ids.length} membro{squad.member_ids.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Package className="h-3 w-3" />
                        {squadProducts.length} produto{squadProducts.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {totalDailies} daily{totalDailies === 1 ? "" : "s"}
                      </Badge>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                    </div>
                  </CardContent>
                </Card>

                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pl-2 border-l-2 border-primary/30 ml-3 space-y-3"
                  >
                    {squadProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-2">
                        <span className="text-[11px] text-muted-foreground mr-1">Produtos da squad:</span>
                        {squadProducts.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {squadProducts.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center text-sm text-muted-foreground">
                      Esta squad ainda não tem produtos vinculados.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {squadProducts.map((p) => {
                      const card = dailiesByProduct[p.id];
                      const hasDaily = !!card;
                      const status = hasDaily ? statusFromBlocker(card.latest.blocker_level) : null;
                      const Icon = status?.icon;
                      const aiSummary = card?.latest.ai_insights?.resumo_executivo ?? "Sem dailys registradas ainda.";
                      return (
                        <Card
                          key={p.id}
                          className="cursor-pointer hover:border-primary/50 transition-all group h-full"
                          onClick={() => navigate(`/daily-status/${p.id}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                                <CardTitle className="text-sm truncate group-hover:text-primary transition-colors">{p.name}</CardTitle>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {status && Icon && (
                                  <Badge className={cn("border text-[10px]", status.cls)}>
                                    <Icon className="h-3 w-3 mr-1" /> {status.label}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); setConfigFor({ id: p.id, name: p.name }); }}
                                  title="Configuração do projeto"
                                >
                                  <Settings className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-xs text-muted-foreground line-clamp-3 italic">"{aiSummary}"</p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                              <span>{card?.count ?? 0} daily{(card?.count ?? 0) === 1 ? "" : "s"}</span>
                              {card && <span>Última: {format(new Date(card.latest.status_date), "dd/MM/yyyy", { locale: ptBR })}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <SquadFormModal open={openSquadDialog} onOpenChange={setOpenSquadDialog} />
      {configFor && (
        <ProjectConfigModal
          open={!!configFor}
          onOpenChange={(o) => !o && setConfigFor(null)}
          productId={configFor.id}
          productName={configFor.name}
        />
      )}
    </div>
  );
}
