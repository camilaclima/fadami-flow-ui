import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Plus, CalendarCheck, TrendingUp, AlertTriangle, Flame,
  Sparkles, Activity, Smile, Frown, Meh, Heart, Loader2, ListChecks, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { NewDailyDialog } from "@/components/daily/NewDailyDialog";

interface AIRecorrencia {
  descricao: string;
  dias_consecutivos: number;
  responsavel?: string;
}
interface AIInsights {
  avancos: string[];
  riscos: string[];
  recorrencias: AIRecorrencia[];
  status_geral: "saudavel" | "atencao" | "critico";
  resumo_executivo: string;
  vibe_equipe?: "motivada" | "neutra" | "desgastada" | "frustrada";
  proximos_passos?: string[];
}

interface DailyRow {
  id: string;
  product_id: string;
  sprint_id: string;
  status_date: string;
  present_member_ids: string[];
  summary: string;
  blocker_level: number;
  ai_insights: AIInsights | null;
  created_at: string;
}

const VIBE_MAP: Record<NonNullable<AIInsights["vibe_equipe"]>, { label: string; icon: any; cls: string }> = {
  motivada: { label: "Motivada", icon: Heart, cls: "text-emerald-600 bg-emerald-500/15 border-emerald-500/30" },
  neutra: { label: "Neutra", icon: Meh, cls: "text-slate-600 bg-slate-500/15 border-slate-500/30" },
  desgastada: { label: "Desgastada", icon: Frown, cls: "text-amber-600 bg-amber-500/15 border-amber-500/30" },
  frustrada: { label: "Frustrada", icon: Frown, cls: "text-red-600 bg-red-500/15 border-red-500/30" },
};

export default function DailyStatusProjectDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: products = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: teamMembers = [] } = useTeamMembers();
  const [openDialog, setOpenDialog] = useState(false);

  const product = products.find((p) => p.id === productId);

  const { data: dailies = [], isLoading } = useQuery({
    queryKey: ["daily_status_history", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("daily_status") as any)
        .select("*").eq("product_id", productId!).order("status_date", { ascending: false });
      if (error) throw error;
      return data as DailyRow[];
    },
  });

  const sprintNameMap = Object.fromEntries(sprints.map((s) => [s.id, s.name]));
  const memberNameMap = Object.fromEntries(teamMembers.map((m) => [m.id, m.name]));

  const latest = dailies[0];
  const latestInsights = latest?.ai_insights;

  const stats = useMemo(() => {
    if (!dailies.length) return null;
    const avgBlocker = dailies.reduce((s, d) => s + d.blocker_level, 0) / dailies.length;
    const today = new Date();
    // recurrences from latest tagged with consecutive days
    return {
      avgBlocker,
      total: dailies.length,
      latestDate: latest?.status_date,
      daysSinceLatest: latest ? differenceInCalendarDays(today, new Date(latest.status_date)) : 0,
    };
  }, [dailies, latest]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/daily-status")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{product?.name ?? "Projeto"}</h1>
            <p className="text-sm text-muted-foreground">Dashboard inteligente de dailys</p>
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
      ) : dailies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhuma daily registrada para este projeto ainda.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="historico" className="space-y-4">
          <TabsList>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="ia">Inteligência IA</TabsTrigger>
            <TabsTrigger value="executivo">Dashboard Executivo</TabsTrigger>
          </TabsList>

          {/* HISTORICO */}
          <TabsContent value="historico" className="space-y-3">
            {dailies.map((d) => {
              const presentNames = (d.present_member_ids ?? []).map((id) => memberNameMap[id] ?? id);
              return (
                <Card key={d.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{format(new Date(d.status_date), "dd/MM/yyyy", { locale: ptBR })}</Badge>
                        <Badge variant="outline">Sprint: {sprintNameMap[d.sprint_id] ?? "—"}</Badge>
                        <Badge variant="outline">Bloqueio {d.blocker_level}/5</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {presentNames.length} membro{presentNames.length !== 1 ? "s" : ""} presente{presentNames.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {presentNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {presentNames.map((n, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{d.summary}</p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* IA */}
          <TabsContent value="ia" className="space-y-4">
            {!latestInsights ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Sem insights gerados ainda.</CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo Executivo (última daily)</CardTitle>
                    <CardDescription>{latestInsights.resumo_executivo}</CardDescription>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
                        <CardTitle className="text-base">Avanços</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {latestInsights.avancos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum avanço destacado.</p>
                      ) : (
                        <ul className="space-y-2">
                          {latestInsights.avancos.map((a, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600"><AlertTriangle className="h-4 w-4" /></div>
                        <CardTitle className="text-base">Riscos</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {latestInsights.riscos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum risco identificado.</p>
                      ) : (
                        <ul className="space-y-2">
                          {latestInsights.riscos.map((r, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-500/15 text-red-600"><Flame className="h-4 w-4" /></div>
                        <CardTitle className="text-base">Gargalos / Recorrências</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {latestInsights.recorrencias.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma recorrência detectada.</p>
                      ) : (
                        <ul className="space-y-3">
                          {latestInsights.recorrencias.map((r, i) => {
                            const stuck = r.dias_consecutivos > 1;
                            return (
                              <li key={i} className={cn(
                                "p-2 rounded-md space-y-1",
                                stuck && "bg-red-500/10 border border-red-500/30"
                              )}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cn("text-sm font-medium", stuck && "text-red-600")}>
                                    {r.descricao}
                                  </span>
                                  <Badge variant="destructive" className="flex-shrink-0">
                                    {r.dias_consecutivos}º dia
                                  </Badge>
                                </div>
                                {r.responsavel && (
                                  <p className="text-xs text-muted-foreground">Responsável: {r.responsavel}</p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* EXECUTIVO */}
          <TabsContent value="executivo" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Activity className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Bloqueio médio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.avgBlocker.toFixed(1) ?? "—"}<span className="text-base text-muted-foreground">/5</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Média sobre {stats?.total ?? 0} daily(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Smile className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Vibe da equipe</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {latestInsights?.vibe_equipe ? (() => {
                    const v = VIBE_MAP[latestInsights.vibe_equipe];
                    const Icon = v.icon;
                    return (
                      <Badge className={cn("border text-sm gap-1.5 py-1.5 px-3", v.cls)}>
                        <Icon className="h-4 w-4" /> {v.label}
                      </Badge>
                    );
                  })() : <p className="text-sm text-muted-foreground">Sem leitura disponível</p>}
                  <p className="text-xs text-muted-foreground mt-2">Análise da última daily</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><CalendarCheck className="h-4 w-4" /></div>
                    <CardTitle className="text-base">Última daily</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.daysSinceLatest === 0 ? "Hoje" : `${stats?.daysSinceLatest}d atrás`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {latest && format(new Date(latest.status_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><ListChecks className="h-4 w-4" /></div>
                  <CardTitle className="text-base">Próximos passos sugeridos pela IA</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {latestInsights?.proximos_passos?.length ? (
                  <ul className="space-y-2">
                    {latestInsights.proximos_passos.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão disponível ainda.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <NewDailyDialog open={openDialog} onOpenChange={setOpenDialog} lockedProductId={productId} />
    </div>
  );
}
