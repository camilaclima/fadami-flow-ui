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
import { Trash2, Pencil, ArrowRight, History, FileText, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity, ActivityImpact, ActivityStatus, NewActivityInput } from "@/hooks/useActivities";
import { IMPACT_LABELS, STATUS_LABELS, useAddActivity, useUpdateActivity, useActivityHistory, useDeleteActivity } from "@/hooks/useActivities";
import { useMyTeamMembers } from "@/hooks/useMyTeamMembers";
import type { Product } from "@/hooks/useProducts";
import type { Sprint } from "@/types/sprint";
import { useSprintProducts } from "@/hooks/useSprintProducts";
import { format } from "date-fns";

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

  const formatVal = (v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.length ? v.map((id) => members.find((m) => m.id === id)?.name ?? id).join(", ") : "—";
    return String(v);
  };

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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-3">{formContent}</TabsContent>
            <TabsContent value="history" className="mt-3 space-y-2">
              {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma alteração registrada ainda.</p>}
              {history.map((h) => (
                <div key={h.id} className="border border-border rounded-md p-2 text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{h.changed_by_email || "—"}</span>
                    <span>{format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="space-y-0.5">
                    {Object.entries(h.changes).map(([k, v]) => (
                      <div key={k} className="flex flex-wrap items-center gap-1">
                        <span className="font-medium">{fieldLabel(k)}:</span>
                        <span className="line-through text-muted-foreground">{formatVal(v.old)}</span>
                        <span>→</span>
                        <span className="text-foreground font-medium">{formatVal(v.new)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}