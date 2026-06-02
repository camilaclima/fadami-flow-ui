import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { CoordinatorTask, TaskCategory, TaskUrgency, useUpsertTask } from "@/hooks/useCoordinatorTasks";

const NONE = "__none__";

export function NewTaskModal({
  open,
  onOpenChange,
  productIds,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productIds: string[] | null;
  editing?: CoordinatorTask | null;
}) {
  const { data: products = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const upsert = useUpsertTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("custom");
  const [urgency, setUrgency] = useState<TaskUrgency>("medium");
  const [productId, setProductId] = useState<string>(NONE);
  const [sprintId, setSprintId] = useState<string>(NONE);
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCategory((editing?.category ?? "custom") as TaskCategory);
      setUrgency((editing?.urgency ?? "medium") as TaskUrgency);
      setProductId(editing?.product_id ?? NONE);
      setSprintId(editing?.sprint_id ?? NONE);
      setDeadline(editing?.deadline_date ?? "");
    }
  }, [open, editing]);

  const visibleProducts = useMemo(() => {
    if (!productIds) return products;
    return products.filter((p) => productIds.includes(p.id));
  }, [products, productIds]);

  const visibleSprints = useMemo(() => {
    if (productId === NONE) return sprints;
    const filtered = sprints.filter((s) => (s as any).product_id === productId);
    // Fallback: if no sprint matches the selected product, show all so the user is never stuck with an empty list.
    return filtered.length ? filtered : sprints;
  }, [sprints, productId]);

  const submit = async () => {
    if (!title.trim()) return;
    await upsert.mutateAsync({
      id: editing?.id,
      title: title.trim(),
      description,
      category,
      urgency,
      product_id: productId === NONE ? null : productId,
      sprint_id: sprintId === NONE ? null : sprintId,
      deadline_date: deadline || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Cobrar fornecedor da API de pagamento" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocker">🚨 Bloqueio</SelectItem>
                  <SelectItem value="schedule_risk">📅 Risco de cronograma</SelectItem>
                  <SelectItem value="activity">🧩 Atividade</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgência</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as TaskUrgency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Projeto</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setSprintId(NONE); }}>
                <SelectTrigger><SelectValue placeholder="Sem projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem projeto</SelectItem>
                  {visibleProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue placeholder="Sem sprint" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem sprint</SelectItem>
                  {visibleSprints.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!title.trim() || upsert.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}