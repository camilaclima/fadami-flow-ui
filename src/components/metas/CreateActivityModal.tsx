import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Activity, ActivityImpact, NewActivityInput } from "@/hooks/useActivities";
import { IMPACT_LABELS, useAddActivity } from "@/hooks/useActivities";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { Product } from "@/hooks/useProducts";
import type { Sprint } from "@/types/sprint";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  sprints: Sprint[];
  activities: Activity[];
  defaultProductId?: string | null;
  defaultSprintId?: string | null;
  onCreated?: (a: Activity) => void;
}

export function CreateActivityModal({ open, onOpenChange, products, sprints, activities, defaultProductId, defaultSprintId, onCreated }: Props) {
  const add = useAddActivity();
  const { data: members = [] } = useTeamMembers();

  const [task, setTask] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [impact, setImpact] = useState<ActivityImpact>("medium");
  const [sprintId, setSprintId] = useState<string>("__none__");
  const [dependencyId, setDependencyId] = useState<string>("__none__");
  const [responsibleId, setResponsibleId] = useState<string>("__none__");

  useEffect(() => {
    if (open) {
      setTask("");
      setProductId(defaultProductId || (products[0]?.id ?? ""));
      setDeadline("");
      setImpact("medium");
      setSprintId(defaultSprintId ?? "__none__");
      setDependencyId("__none__");
      setResponsibleId("__none__");
    }
  }, [open, defaultProductId, defaultSprintId, products]);

  const sprintsForProduct = sprints.filter((s) => !productId || s.product_id === productId);
  const depCandidates = activities.filter((a) => !productId || a.product_id === productId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim() || !productId) return;
    const payload: NewActivityInput = {
      task: task.trim(),
      product_id: productId,
      deadline_date: deadline || null,
      impact,
      sprint_id: sprintId === "__none__" ? null : sprintId,
      dependency_id: dependencyId === "__none__" ? null : dependencyId,
      responsible_id: responsibleId === "__none__" ? null : responsibleId,
    };
    const created = await add.mutateAsync(payload);
    onCreated?.(created);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={task} onChange={(e) => setTask(e.target.value)} required />
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
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Responsável</Label>
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não atribuído</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={add.isPending}>Criar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}