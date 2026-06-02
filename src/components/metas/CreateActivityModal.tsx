import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Pencil, ArrowRight, History, FileText, Save, Sparkles, Plus, Loader2, MessageSquare, AlertTriangle, CheckCircle2, GitBranch, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity, ActivityImpact, ActivityStatus, NewActivityInput } from "@/hooks/useActivities";
import { IMPACT_LABELS, STATUS_LABELS, useAddActivity, useUpdateActivity, useActivityHistory, useDeleteActivity } from "@/hooks/useActivities";
import { useMyTeamMembers } from "@/hooks/useMyTeamMembers";
import type { Product } from "@/hooks/useProducts";
import type { Sprint } from "@/types/sprint";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  sprints: Sprint[];
  activities: Activity[];
  defaultProductId?: string | null;
  defaultSprintId?: string | null;
  editing?: Activity | null;
  onCreated?: (a: Activity) => void;
}

export function CreateActivityModal({ open, onOpenChange, products, sprints, activities, defaultProductId, defaultSprintId, editing, onCreated }: Props) {
  const add = useAddActivity();
  const update = useUpdateActivity();
  const del = useDeleteActivity();
  const { data: members = [] } = useMyTeamMembers();
  const { data: sprintProducts = [] } = useSprintProducts();
  const isEdit = !!editing;
  const { data: history = [] } = useActivityHistory(isEdit ? editing!.id : null);

  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [impact, setImpact] = useState<ActivityImpact>("medium");
  const [status, setStatus] = useState<ActivityStatus>("todo");
  const [sprintId, setSprintId] = useState<string>("__none__");
  const [dependencyId, setDependencyId] = useState<string>("__none__");
  const [responsibleIds, setResponsibleIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTask(editing.task);
        setDescription(editing.description ?? "");
        setProductId(editing.product_id);
        setDeadline(editing.deadline_date ?? "");
        setImpact(editing.impact);
        setStatus(editing.status);
        setSprintId(editing.sprint_id ?? "__none__");
        setDependencyId(editing.dependency_id ?? "__none__");
        setResponsibleIds(
          editing.responsible_ids?.length ? editing.responsible_ids : (editing.responsible_id ? [editing.responsible_id] : [])
        );
      } else {
        setTask("");
        setDescription("");
        setProductId("");
        setDeadline("");
        setImpact("medium");
        setStatus("todo");
        setSprintId("__none__");
        setDependencyId("__none__");
        setResponsibleIds([]);
      }
    }
  }, [open, editing]);

  const sprintsForProduct = sprints.filter((s) => {
    if (!productId) return true;
    if (s.product_id === productId) return true;
    return sprintProducts.some((sp) => sp.sprint_id === s.id && sp.product_id === productId);
  });
  const depCandidates = activities.filter((a) => (!productId || a.product_id === productId) && (!editing || a.id !== editing.id));

  const toggleResp = (id: string) =>
    setResponsibleIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim() || !productId) return;
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        task: task.trim(),
        description: description.trim(),
        product_id: productId,
        deadline_date: deadline || null,
        deadline: deadline ?? "",
        impact,
        status,
        sprint_id: sprintId === "__none__" ? null : sprintId,
        dependency_id: dependencyId === "__none__" ? null : dependencyId,
        responsible_ids: responsibleIds,
        responsible_id: responsibleIds[0] ?? null,
      } as any);
    } else {
      const payload: NewActivityInput = {
        task: task.trim(),
        description: description.trim(),
        product_id: productId,
        deadline_date: deadline || null,
        impact,
        sprint_id: sprintId === "__none__" ? null : sprintId,
        dependency_id: dependencyId === "__none__" ? null : dependencyId,
        responsible_ids: responsibleIds,
        status,
      };
      const created = await add.mutateAsync(payload);
      onCreated?.(created);
    }
    onOpenChange(false);
  };

  const fieldLabel = (k: string) => ({
    task: "Título", description: "Descrição", product_id: "Projeto", deadline_date: "Prazo",
    impact: "Impacto", status: "Status", sprint_id: "Sprint", dependency_id: "Dependência",
    responsible_ids: "Responsáveis", responsible_id: "Responsável",
  } as Record<string, string>)[k] ?? k;

  const productName = (id: any) => products.find((p) => p.id === id)?.name ?? "—";
  const sprintName = (id: any) => sprints.find((s) => s.id === id)?.name ?? "—";
  const activityName = (id: any) => activities.find((a) => a.id === id)?.task ?? "—";
  const memberNames = (ids: any) => {
    const arr = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (!arr.length) return "—";
    return arr.map((id: string) => members.find((m) => m.id === id)?.name ?? id).join(", ");
  };

  const prettyVal = (key: string, v: any) => {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return "—";
    switch (key) {
      case "product_id": return productName(v);
      case "sprint_id": return sprintName(v);
      case "dependency_id": return activityName(v);
      case "responsible_ids":
      case "responsible_id": return memberNames(v);
      case "impact": return IMPACT_LABELS[v as ActivityImpact] ?? String(v);
      case "status": return STATUS_LABELS[v as ActivityStatus] ?? String(v);
      case "deadline_date":
      case "deadline": {
        try { return format(new Date(String(v)), "dd/MM/yyyy"); } catch { return String(v); }
      }
      default: return String(v);
    }
  };

  // Reconstruct the originally-registered values by overlaying the oldest known "old"
  // for each field on top of the current activity.
  const originalValues = useMemo(() => {
    if (!editing) return null as any;
    const base: Record<string, any> = { ...editing };
    const asc = [...history].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const seen = new Set<string>();
    for (const h of asc) {
      for (const [k, v] of Object.entries(h.changes)) {
        if (seen.has(k)) continue;
        seen.add(k);
        base[k] = (v as any).old;
      }
    }
    return base;
  }, [editing, history]);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setMode("view");
      setNotes("");
    }
  }, [open, editing]);

  const saveNotes = async () => {
    if (!editing || !notes.trim()) return;
    setSavingNotes(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase.from("activity_history") as any).insert({
        activity_id: editing.id,
        changed_by: u?.user?.id ?? null,
        changed_by_email: u?.user?.email ?? "",
        changes: { __note__: { old: "", new: notes.trim() } },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["activity_history", editing.id] });
      setNotes("");
      toast.success("Observação adicionada!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar observação");
    } finally {
      setSavingNotes(false);
    }
  };

  const qc = useQueryClient();
  const [syncingDaily, setSyncingDaily] = useState(false);

  const syncFromDaily = async () => {
    if (!editing || !editing.sprint_id) {
      toast.error("Atividade precisa estar vinculada a uma sprint.");
      return;
    }
    setSyncingDaily(true);
    try {
      const { data: dailies, error: derr } = await (supabase.from("daily_status") as any)
        .select("status_date, summary")
        .eq("sprint_id", editing.sprint_id)
        .order("status_date", { ascending: true });
      if (derr) throw derr;
      if (!dailies || dailies.length === 0) {
        toast.info("Nenhuma daily encontrada para esta sprint.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("analyze-activity-from-daily", {
        body: {
          activityTask: editing.task,
          activityDescription: editing.description,
          dailies,
        },
      });
      if (error) throw error;
      const updates = (data as any)?.updates ?? [];
      if (!updates.length) {
        toast.info("Nenhuma menção relevante encontrada nas dailies.");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const rows = updates.map((up: any) => ({
        activity_id: editing.id,
        changed_by: u?.user?.id ?? null,
        changed_by_email: "IA · Daily",
        changes: { __ai_note__: { old: up.date, new: up.text, type: up.type } },
      }));
      const { error: ierr } = await (supabase.from("activity_history") as any).insert(rows);
      if (ierr) throw ierr;
      qc.invalidateQueries({ queryKey: ["activity_history", editing.id] });
      toast.success(`${updates.length} atualização(ões) da IA adicionada(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao sincronizar com a daily");
    } finally {
      setSyncingDaily(false);
    }
  };

  const [showAddNote, setShowAddNote] = useState(false);

  const OriginalRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="w-32 shrink-0 text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{label}</div>
      <div className="flex-1 text-sm text-foreground">{value}</div>
    </div>
  );

  const formContent = (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Título</Label>
        <Input value={task} onChange={(e) => setTask(e.target.value)} required />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes da atividade (opcional)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Projeto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prazo</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Impacto</Label>
          <Select value={impact} onValueChange={(v) => setImpact(v as ActivityImpact)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(IMPACT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsáveis</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start font-normal">
                {responsibleIds.length === 0 ? "Nenhum (opcional)" : `${responsibleIds.length} selecionado(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 max-h-64 overflow-y-auto">
              {members.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhum membro disponível.</p>}
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={responsibleIds.includes(m.id)} onCheckedChange={() => toggleResp(m.id)} />
                  <span className="flex-1 truncate">{m.name}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {responsibleIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {responsibleIds.map((id) => {
            const m = members.find((x) => x.id === id);
            return m ? <Badge key={id} variant="secondary" className="text-[10px]">{m.name}</Badge> : null;
          })}
        </div>
      )}
      <div>
        <Label>Vincular à Sprint</Label>
        <Select value={sprintId} onValueChange={setSprintId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Não vincular a nenhuma sprint</SelectItem>
            {sprintsForProduct.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Dependência (opcional)</Label>
        <Select value={dependencyId} onValueChange={setDependencyId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem dependência</SelectItem>
            {depCandidates.map((a) => <SelectItem key={a.id} value={a.id}>{a.task}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <div className="flex w-full items-center justify-between gap-2">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive gap-1.5 h-8 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A atividade "{editing!.task}" será removida permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      await del.mutateAsync(editing!.id);
                      onOpenChange(false);
                    }}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={add.isPending || update.isPending}>{isEdit ? "Salvar alterações" : "Criar"}</Button>
          </div>
        </div>
      </DialogFooter>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <Tabs defaultValue="original" className="w-full">
            <TabsList>
              <TabsTrigger value="original" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Atividade Original
              </TabsTrigger>
              <TabsTrigger value="updates" className="gap-1.5">
                <History className="w-3.5 h-3.5" /> Atualizações
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{history.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="original" className="mt-3 space-y-4">
              {mode === "edit" ? (
                <div className="space-y-4">
                  {formContent}
                  <div className="space-y-2 rounded-xl border border-border bg-muted/10 p-4">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Observações livres (opcional)
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Adicione observações ou contexto. Será registrado na aba Atualizações."
                    />
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={saveNotes} disabled={savingNotes || !notes.trim()}>
                        <Save className="w-3.5 h-3.5" /> Registrar observação
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Snapshot dos valores originalmente cadastrados.
                    </p>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setMode("edit")}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <OriginalRow label="Título" value={<span className="font-medium">{originalValues?.task ?? "—"}</span>} />
                    <OriginalRow label="Descrição" value={
                      <span className="whitespace-pre-wrap text-muted-foreground">
                        {originalValues?.description?.trim() ? originalValues.description : "—"}
                      </span>
                    } />
                    <OriginalRow label="Projeto" value={prettyVal("product_id", originalValues?.product_id)} />
                    <OriginalRow label="Prazo" value={prettyVal("deadline_date", originalValues?.deadline_date)} />
                    <OriginalRow label="Impacto" value={
                      <Badge variant="outline" className="text-[10px]">{prettyVal("impact", originalValues?.impact)}</Badge>
                    } />
                    <OriginalRow label="Status" value={
                      <Badge variant="outline" className="text-[10px]">{prettyVal("status", originalValues?.status)}</Badge>
                    } />
                    <OriginalRow label="Sprint" value={prettyVal("sprint_id", originalValues?.sprint_id)} />
                    <OriginalRow label="Dependência" value={prettyVal("dependency_id", originalValues?.dependency_id)} />
                    <OriginalRow label="Responsáveis" value={prettyVal("responsible_ids", originalValues?.responsible_ids ?? originalValues?.responsible_id)} />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="updates" className="mt-3">
              {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Nenhuma atualização registrada ainda.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Edições aparecem aqui automaticamente.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                  {history.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{h.changed_by_email || "Sistema"}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {Object.entries(h.changes).map(([k, v]) => (
                            <div key={k} className="text-xs rounded-md bg-muted/40 p-2">
                              <div className="font-medium text-foreground mb-1">{fieldLabel(k)}</div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded border text-[11px]",
                                  "bg-red-500/10 text-red-700 border-red-500/30 line-through decoration-red-500/60"
                                )}>
                                  {prettyVal(k, v.old)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className={cn(
                                  "px-2 py-0.5 rounded border text-[11px] font-medium",
                                  "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                )}>
                                  {prettyVal(k, v.new)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}