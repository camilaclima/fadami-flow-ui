import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAddSprint } from "@/hooks/useSprints";
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
  const addActivity = useAddActivity();
  const updateActivity = useUpdateActivity();

  const [name, setName] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<DraftActivity[]>([]);

  useEffect(() => {
    if (open) {
      setName("");
      setProductId(defaultProductId || products[0]?.id || "");
      setStartDate("");
      setEndDate("");
      setLinkedIds(new Set());
      setDrafts([]);
    }
  }, [open, defaultProductId, products]);

  const eligible = useMemo(
    () => unassignedActivities.filter((a) => !productId || a.product_id === productId),
    [unassignedActivities, productId]
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
    if (!name.trim() || !startDate || !endDate || !productId) return;
    try {
      const sprint = await addSprint.mutateAsync({
        name: name.trim(),
        product_id: productId,
        coordinator_id: user?.id ?? "",
        start_date: startDate,
        end_date: endDate,
        status: "planned",
        sustentation_percent: 0,
        ritual_hours: 0,
      } as any);

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
              product_id: productId,
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
            <div>
              <Label>Projeto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div />
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