import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Plus, Calendar, User, Trash2, ListTodo, CheckCircle2, ArrowRightCircle, MoreHorizontal, Ban, ArrowRightLeft, CircleSlash, ClipboardList } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { IMPACT_LABELS, STATUS_LABELS, useUpdateActivity, type Activity, type ActivityStatus } from "@/hooks/useActivities";
import type { Sprint } from "@/types/sprint";
import { CreateActivityModal } from "./CreateActivityModal";
import type { Product } from "@/hooks/useProducts";
import { useDeleteSprint, useUpdateSprint } from "@/hooks/useSprints";
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
  const updateSprint = useUpdateSprint();
  const updateActivity = useUpdateActivity();
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeadline, setFilterDeadline] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");

  const runAction = (id: string, patch: any) => {
    setPendingActionId(id);
    updateActivity.mutate(patch, {
      onSettled: () => setPendingActionId((cur) => (cur === id ? null : cur)),
    });
  };

  useEffect(() => {
    if (!open) return;
    setHealth(null);
    setLoading(false);
    setFilterMember("all");
    setFilterStatus("all");
    setFilterDeadline("all");
    setFilterProduct("all");
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
  const responsibleNames = (a: Activity) => {
    const ids = Array.from(new Set([a.responsible_id, ...(((a as any).responsible_ids as string[] | undefined) ?? [])].filter(Boolean))) as string[];
    if (ids.length === 0) return "Não atribuído";
    return ids.map((id) => members.find((m) => m.id === id)?.name ?? "—").join(", ");
  };

  const migratedAway = useMemo(() => {
    if (!sprint) return [] as Array<{ activity: Activity; toSprintId: string | null }>;
    return allActivities
      .filter((a) => (a as any).migrated_from_sprint_id === sprint.id && a.sprint_id !== sprint.id)
      .map((a) => ({ activity: a, toSprintId: a.sprint_id }));
  }, [allActivities, sprint]);

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

  const isFinished = sprint.status === "finished";
  const today = new Date().toISOString().slice(0, 10);
  const visibleActivities = activities.filter((a) => (a as any).active !== false);
  const allocatedMembers = useMemo(() => {
    const ids = new Set<string>();
    for (const a of visibleActivities) {
      if (a.responsible_id) ids.add(a.responsible_id);
      ((a as any).responsible_ids ?? []).forEach((id: string) => id && ids.add(id));
    }
    return members.filter((m) => ids.has(m.id));
  }, [visibleActivities, members]);
  const filteredActivities = visibleActivities.filter((a) => {
    if (filterMember !== "all") {
      const ids = [a.responsible_id, ...((a as any).responsible_ids ?? [])].filter(Boolean);
      if (!ids.includes(filterMember)) return false;
    }
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterProduct !== "all" && a.product_id !== filterProduct) return false;
    if (filterDeadline !== "all") {
      if (!a.deadline_date) return filterDeadline === "ontime";
      const overdue = a.deadline_date < today && a.status !== "done";
      if (filterDeadline === "overdue" && !overdue) return false;
      if (filterDeadline === "ontime" && overdue) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta sprint?")) return;
    await deleteSprint.mutateAsync(sprint.id);
    onOpenChange(false);
  };

  const handleFinish = async () => {
    if (!confirm("Concluir esta sprint? Após concluída, ela ficará bloqueada para edição.")) return;
    await updateSprint.mutateAsync({ id: sprint.id, status: "finished" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{sprint.name}</span>
            {isFinished && (
              <Badge className="bg-muted text-muted-foreground border-border gap-1 text-[10px]">
                <CircleSlash className="w-3 h-3" /> Sprint Concluída (somente leitura)
              </Badge>
            )}
          </DialogTitle>
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
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
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
              {!isFinished && (
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Atividade
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Colaborador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {(["todo","in_progress","blocked","done"] as ActivityStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDeadline} onValueChange={setFilterDeadline}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Prazo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os prazos</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="ontime">No prazo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {sprintProductList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterMember !== "all" || filterStatus !== "all" || filterDeadline !== "all" || filterProduct !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => { setFilterMember("all"); setFilterStatus("all"); setFilterDeadline("all"); setFilterProduct("all"); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {visibleActivities.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade vinculada.</p>}
              {visibleActivities.length > 0 && filteredActivities.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma atividade corresponde aos filtros selecionados.</p>
              )}
              {filteredActivities.map((a) => {
                const taskCount = allTasks.filter((t) => t.activity_id === a.id).length;
                const prod = products.find((p) => p.id === a.product_id);
                return (
                <Card
                  key={a.id}
                  className={cn(
                    "p-3 transition",
                    isFinished ? "opacity-90" : "cursor-pointer hover:border-primary/50 hover:shadow-md",
                  )}
                  onClick={() => { if (!isFinished) setEditingActivity(a); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.task}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{responsibleNames(a)}</span>
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
                    <div className="flex items-center gap-2 self-center shrink-0">
                    <Select
                      value={a.status}
                      onValueChange={(v) => {
                        updateActivity.mutate({ id: a.id, status: v as ActivityStatus } as any);
                      }}
                      disabled={isFinished}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-[130px] text-[11px] font-semibold px-3 py-0 border shadow-sm rounded-full transition hover:opacity-90 [&>svg]:opacity-70",
                          STATUS_STYLES[a.status]
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {(["todo","in_progress","blocked","done"] as ActivityStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="text-[11px]">
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1 text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                          disabled={pendingActionId === a.id || isFinished}
                        >
                          {pendingActionId === a.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-3 h-3" />
                          )}
                          {pendingActionId === a.id ? "Aplicando…" : "Ações"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {a.status !== "done" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              runAction(a.id, { id: a.id, status: "done" });
                            }}
                            className="gap-2 text-emerald-600 focus:text-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            runAction(a.id, { id: a.id, active: false });
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
                                runAction(a.id, {
                                  id: a.id,
                                  sprint_id: nextSprint.id,
                                  migrated_from_sprint_id: sprint.id,
                                });
                              }}
                              className="gap-2"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Migrar para {nextSprint.name}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            runAction(a.id, {
                              id: a.id,
                              sprint_id: null,
                              migrated_from_sprint_id: sprint.id,
                            });
                          }}
                          className="gap-2 text-muted-foreground"
                        >
                          <CircleSlash className="w-3.5 h-3.5" /> Desatribuir da sprint
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
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
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{responsibleNames(a)}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline_date ?? "—"}</span>
                            {(() => {
                              const prod = products.find((p) => p.id === a.product_id);
                              return prod ? (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: prod.color }} />
                                  {prod.name}
                                </Badge>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        {toSprintId ? (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 whitespace-nowrap">
                            <ArrowRightCircle className="w-3 h-3" /> Migrada → {sprintName(toSprintId)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-slate-500/10 text-slate-500 border-slate-500/30 whitespace-nowrap">
                            <CircleSlash className="w-3 h-3" /> Desatribuída
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          </TabsContent>
          <TabsContent value="tasks" className="space-y-2">
            {(() => {
              const sprintTasks = allTasks.filter((t) => t.sprint_id === sprint.id && t.category !== "activity");
              if (sprintTasks.length === 0) {
                return (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada a esta sprint.</p>
                  </div>
                );
              }
              return sprintTasks.map((t) => {
                const prod = products.find((p) => p.id === t.product_id);
                const resp = t.responsible_member_id ? members.find((m) => m.id === t.responsible_member_id)?.name ?? "—" : "Não atribuído";
                return (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{resp}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.deadline_date ?? "—"}</span>
                          {prod && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: prod.color }} />
                              {prod.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", t.status === "resolved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30")}>
                        {t.status === "resolved" ? "Resolvida" : "Pendente"}
                      </Badge>
                    </div>
                  </Card>
                );
              });
            })()}
          </TabsContent>
          <TabsContent value="scope">
            <SprintScopeAnalysis sprint={sprint} />
          </TabsContent>
        </Tabs>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center gap-2 flex-wrap">
          {!isFinished ? (
            <Button
              size="sm"
              onClick={handleFinish}
              disabled={updateSprint.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {updateSprint.isPending ? "Concluindo…" : "Concluir Sprint"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Esta sprint foi concluída e está bloqueada para edição.</span>
          )}
          {!isFinished && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-xs text-muted-foreground hover:text-destructive gap-1">
              <Trash2 className="w-3 h-3" /> Excluir sprint
            </Button>
          )}
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