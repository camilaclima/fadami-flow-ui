import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAddSprint } from "@/hooks/useSprints";
import { useSetSprintProducts } from "@/hooks/useSprintProducts";
import { useAddActivity, useUpdateActivity, type Activity, type ActivityImpact, IMPACT_LABELS } from "@/hooks/useActivities";
import type { Product } from "@/hooks/useProducts";
import { Plus, X } from "lucide-react";

interface DraftActivity {
  task: string;
  deadline_date: string;
  impact: ActivityImpact;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  unassignedActivities: Activity[];
  defaultProductId?: string | null;
}

export function CreateSprintModal({ open, onOpenChange, products, unassignedActivities, defaultProductId }: Props) {
  const { user } = useAuth();
  const addSprint = useAddSprint();
  const setSprintProducts = useSetSprintProducts();
  const addActivity = useAddActivity();
  const updateActivity = useUpdateActivity();

  const [name, setName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<DraftActivity[]>([]);

  useEffect(() => {
    if (open) {
      setName("");
      setSelectedProductIds(defaultProductId ? [defaultProductId] : []);
      setStartDate("");
      setEndDate("");
      setLinkedIds(new Set());
      setDrafts([]);
    }
  }, [open, defaultProductId, products]);

  const toggleProd = (id: string) =>
    setSelectedProductIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const eligible = useMemo(
    () => unassignedActivities.filter((a) => selectedProductIds.length === 0 || selectedProductIds.includes(a.product_id)),
    [unassignedActivities, selectedProductIds]
  );

  const toggle = (id: string) => {
    setLinkedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || selectedProductIds.length === 0) {
      toast.error("Preencha nome, datas e ao menos um projeto");
      return;
    }
    const primaryProductId = selectedProductIds[0];
    try {
      const sprint = await addSprint.mutateAsync({
        name: name.trim(),
        product_id: primaryProductId,
        coordinator_id: user?.id ?? "",
        start_date: startDate,
        end_date: endDate,
        status: "planned",
        sustentation_percent: 0,
        ritual_hours: 0,
      } as any);

      await setSprintProducts.mutateAsync({ sprintId: sprint.id, productIds: selectedProductIds });

      // Link existing
      await Promise.all(
        Array.from(linkedIds).map((id) => updateActivity.mutateAsync({ id, sprint_id: sprint.id }))
      );
      // Create drafts linked to sprint
      await Promise.all(
        drafts
          .filter((d) => d.task.trim())
          .map((d) =>
            addActivity.mutateAsync({
              product_id: primaryProductId,
              task: d.task.trim(),
              deadline_date: d.deadline_date || null,
              impact: d.impact,
              sprint_id: sprint.id,
              dependency_id: null,
            })
          )
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar sprint");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Sprint</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <Label>Projetos</Label>
              <div className="border border-border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                {products.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhum projeto disponível.</p>}
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted/40 rounded cursor-pointer">
                    <Checkbox checked={selectedProductIds.includes(p.id)} onCheckedChange={() => toggleProd(p.id)} />
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="flex-1 truncate">{p.name}</span>
                  </label>
                ))}
              </div>
              {selectedProductIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedProductIds.map((id) => {
                    const p = products.find((x) => x.id === id);
                    return p ? <Badge key={id} variant="secondary" className="text-[10px]">{p.name}</Badge> : null;
                  })}
                </div>
              )}
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Vincular atividades existentes (sem sprint)</Label>
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
              {eligible.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma atividade disponível.</p>}
              {eligible.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted/40 rounded cursor-pointer">
                  <Checkbox checked={linkedIds.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <span className="flex-1 truncate">{a.task}</span>
                  {a.deadline_date && <span className="text-xs text-muted-foreground">{a.deadline_date}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Criar novas atividades</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setDrafts((p) => [...p, { task: "", deadline_date: "", impact: "medium" }])}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {drafts.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_120px_auto] gap-2 items-center">
                  <Input placeholder="Título" value={d.task} onChange={(e) => setDrafts((p) => p.map((x, j) => j === i ? { ...x, task: e.target.value } : x))} />
                  <Input type="date" value={d.deadline_date} onChange={(e) => setDrafts((p) => p.map((x, j) => j === i ? { ...x, deadline_date: e.target.value } : x))} />
                  <Select value={d.impact} onValueChange={(v) => setDrafts((p) => p.map((x, j) => j === i ? { ...x, impact: v as ActivityImpact } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(IMPACT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDrafts((p) => p.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={addSprint.isPending}>Criar Sprint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}