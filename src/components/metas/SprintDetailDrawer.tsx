import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Plus, Calendar, User, Trash2, ListTodo, CheckCircle2, ArrowRightCircle, MoreHorizontal, Ban, ArrowRightLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { IMPACT_LABELS, STATUS_LABELS, useUpdateActivity, type Activity, type ActivityStatus } from "@/hooks/useActivities";
import type { Sprint } from "@/types/sprint";
import { CreateActivityModal } from "./CreateActivityModal";
import type { Product } from "@/hooks/useProducts";
import { useDeleteSprint } from "@/hooks/useSprints";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { useCoordinatorTasks } from "@/hooks/useCoordinatorTasks";
import { SprintScopeAnalysis } from "@/components/sprint/SprintScopeAnalysis";

interface HealthResult {
  saude: "verde" | "amarelo" | "vermelho";
  gargalos: string[];
  dicas: string[];
}

const STATUS_STYLES: Record<ActivityStatus, string> = {
  todo: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  blocked: "bg-red-500/15 text-red-600 border-red-500/20",
  done: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
};

const HEALTH_STYLES: Record<string, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-red-500",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint | null;
  activities: Activity[];
  allActivities: Activity[];
  sprints: Sprint[];
  products: Product[];
}

export function SprintDetailDrawer({ open, onOpenChange, sprint, activities, allActivities, sprints, products }: Props) {
  const { data: members = [] } = useTeamMembers();
  const { data: sprintProducts = [] } = useSprintProducts();
  const { data: allTasks = [] } = useCoordinatorTasks(null);
  const deleteSprint = useDeleteSprint();
  const updateActivity = useUpdateActivity();
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!open) return;
    setHealth(null);
    setLoading(false);
  }, [open, sprint?.id]);

  const runAnalysis = () => {
    if (!sprint) return;
    setLoading(true);
    supabase.functions
      .invoke("analyze-sprint-health", { body: { sprint, activities, members } })
      .then(({ data, error }) => {
        if (error) throw error;
        setHealth(data as HealthResult);
      })
      .catch(() => setHealth({ saude: "amarelo", gargalos: [], dicas: [] }))
      .finally(() => setLoading(false));
  };

  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "—" : "Não atribuído");

  // Fetch history entries that record sprint_id transitions
  const { data: migrationHistory = [] } = useQuery({
    queryKey: ["sprint_migration_history", sprint?.id],
    enabled: !!sprint?.id && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("activity_history") as any)
        .select("activity_id, changes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ activity_id: string; changes: any; created_at: string }>;
    },
  });

  const migratedAway = useMemo(() => {
    if (!sprint) return [] as Array<{ activity: Activity; toSprintId: string | null }>;
    // Most recent sprint change per activity
    const latestPerActivity = new Map<string, { old: string | null; new: string | null }>();
    for (const h of migrationHistory) {
      if (latestPerActivity.has(h.activity_id)) continue;
      const ch = h.changes?.sprint_id;
      if (!ch) continue;
      latestPerActivity.set(h.activity_id, { old: ch.old ?? null, new: ch.new ?? null });
    }
    const out: Array<{ activity: Activity; toSprintId: string | null }> = [];
    latestPerActivity.forEach((ch, actId) => {
      if (ch.old !== sprint.id) return; // wasn't in this sprint
      const act = allActivities.find((a) => a.id === actId);
      if (!act) return;
      if (act.sprint_id === sprint.id) return; // came back; current sprint
      out.push({ activity: act, toSprintId: ch.new });
    });
    return out;
  }, [migrationHistory, allActivities, sprint]);

  const sprintName = (id: string | null) => (id ? sprints.find((s) => s.id === id)?.name ?? "outra sprint" : "sem sprint");

  const nextSprint = useMemo(() => {
    if (!sprint) return null;
    const ref = sprint.end_date ?? sprint.start_date;
    if (!ref) return null;
    const candidates = sprints
      .filter((s) => s.id !== sprint.id && s.start_date && s.start_date > ref)
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
    return candidates[0] ?? null;
  }, [sprint, sprints]);

  if (!sprint) return null;

  const linkedProductIds = sprintProducts.filter((sp) => sp.sprint_id === sprint.id).map((sp) => sp.product_id);
  const sprintProductList = linkedProductIds.length
    ? products.filter((p) => linkedProductIds.includes(p.id))
    : products.filter((p) => p.id === sprint.product_id);

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta sprint?")) return;
    await deleteSprint.mutateAsync(sprint.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sprint.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">{sprint.start_date} → {sprint.end_date}</p>
          {sprintProductList.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {sprintProductList.map((p) => (
                <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="scope">Escopo</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Saúde da Sprint</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("w-3 h-3 rounded-full", health ? HEALTH_STYLES[health.saude] : "bg-muted")} />
                    <span className="text-sm font-semibold capitalize">{health?.saude ?? (loading ? "Analisando…" : "—")}</span>
                  </div>
                </div>
                <Badge variant="outline">{activities.length} atividades</Badge>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Análise IA</h3>
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                <Button size="sm" variant="outline" className="ml-auto h-7 gap-1.5" onClick={runAnalysis} disabled={loading}>
                  <Sparkles className="w-3 h-3" /> {health ? "Atualizar" : "Gerar"}
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                {!health && !loading && (
                  <p className="text-xs text-muted-foreground">Clique em "Gerar" para ver gargalos e dicas.</p>
                )}
                {health && (<>
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1">Gargalos Detectados</p>
                  {health?.gargalos?.length ? (
                    <ul className="list-disc pl-5 space-y-1">{health.gargalos.map((g, i) => <li key={i}>{g}</li>)}</ul>
                  ) : <p className="text-xs text-muted-foreground">Nenhum gargalo identificado.</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-500 mb-1">Dicas de Recuperação</p>
                  {health?.dicas?.length ? (
                    <ul className="list-disc pl-5 space-y-1">{health.dicas.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  ) : <p className="text-xs text-muted-foreground">—</p>}
                </div>
                </>)}
              </div>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Atividades da Sprint</h3>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Atividade
              </Button>
            </div>
            <div className="space-y-2">
              {activities.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade vinculada.</p>}
              {activities.filter((a) => (a as any).active !== false).map((a) => {
                const taskCount = allTasks.filter((t) => t.activity_id === a.id).length;
                const prod = products.find((p) => p.id === a.product_id);
                return (
                <Card
                  key={a.id}
                  className="p-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition"
                  onClick={() => setEditingActivity(a)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.task}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{memberName(a.responsible_id)}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline_date ?? "—"}</span>
                        <Badge variant="outline" className="text-[10px]">{IMPACT_LABELS[a.impact]}</Badge>
                        {prod && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: prod.color }} />
                            {prod.name}
                          </Badge>
                        )}
                        {taskCount > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/30">
                            <ListTodo className="w-3 h-3" /> {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] border", STATUS_STYLES[a.status])} variant="outline">
                      {STATUS_LABELS[a.status]}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1 text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" /> Ações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {a.status !== "done" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateActivity.mutate({ id: a.id, status: "done" } as any);
                            }}
                            className="gap-2 text-emerald-600 focus:text-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            updateActivity.mutate({ id: a.id, active: false } as any);
                          }}
                          className="gap-2"
                        >
                          <Ban className="w-3.5 h-3.5" /> Inativar
                        </DropdownMenuItem>
                        {nextSprint && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateActivity.mutate({ id: a.id, sprint_id: nextSprint.id } as any);
                              }}
                              className="gap-2"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Migrar para {nextSprint.name}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
                );
              })}
              {migratedAway.length > 0 && (
                <div className="pt-3 mt-3 border-t border-dashed border-border space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Migradas desta sprint
                  </p>
                  {migratedAway.map(({ activity: a, toSprintId }) => (
                    <Card
                      key={`mig-${a.id}`}
                      className="p-3 cursor-pointer hover:border-primary/50 transition opacity-80 border-dashed"
                      onClick={() => setEditingActivity(a)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate line-through decoration-muted-foreground/40">{a.task}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{memberName(a.responsible_id)}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline_date ?? "—"}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 whitespace-nowrap">
                          <ArrowRightCircle className="w-3 h-3" /> Migrada → {sprintName(toSprintId)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          </TabsContent>
          <TabsContent value="scope">
            <SprintScopeAnalysis sprint={sprint} />
          </TabsContent>
        </Tabs>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-xs text-muted-foreground hover:text-destructive gap-1">
            <Trash2 className="w-3 h-3" /> Excluir sprint
          </Button>
        </div>

        <CreateActivityModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          products={products}
          sprints={sprints}
          activities={allActivities}
          defaultProductId={sprint.product_id}
          defaultSprintId={sprint.id}
        />

        <CreateActivityModal
          open={!!editingActivity}
          onOpenChange={(o) => !o && setEditingActivity(null)}
          products={products}
          sprints={sprints}
          activities={allActivities}
          editing={editingActivity}
        />
      </DialogContent>
    </Dialog>
  );
}