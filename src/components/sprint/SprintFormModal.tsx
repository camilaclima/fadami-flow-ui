import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import type { Sprint } from "@/types/sprint";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint | null;
  onSave: (data: {
    name: string;
    product_id: string | null;
    start_date: string;
    end_date: string;
    status: string;
    sustentation_percent: number;
    ritual_hours: number;
  }) => void;
}

export function SprintFormModal({ open, onOpenChange, sprint, onSave }: Props) {
  const { data: products = [] } = useProducts();
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [sustentation, setSustentation] = useState(0);
  const [ritualHours, setRitualHours] = useState(0);

  useEffect(() => {
    if (open) {
      setName(sprint?.name ?? "");
      setProductId(sprint?.product_id ?? "");
      setStartDate(sprint?.start_date ?? "");
      setEndDate(sprint?.end_date ?? "");
      setStatus(sprint?.status ?? "planned");
      setSustentation(sprint?.sustentation_percent ?? 0);
      setRitualHours(sprint?.ritual_hours ?? 0);
    }
  }, [open, sprint]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onSave({
      name: name.trim(),
      product_id: productId || null,
      start_date: startDate,
      end_date: endDate,
      status,
      sustentation_percent: sustentation,
      ritual_hours: ritualHours,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sprint ? "Editar Sprint" : "Nova Sprint"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Sprint 01 - Janeiro" required />
          </div>

          <div>
            <Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {sprint && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejada</SelectItem>
                  <SelectItem value="active">Em Execução</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>% Sustentação</Label>
              <Input type="number" min={0} max={100} step={1} value={sustentation} onChange={(e) => setSustentation(Number(e.target.value))} />
            </div>
            <div>
              <Label>Horas de Ritos</Label>
              <Input type="number" min={0} step={0.5} value={ritualHours} onChange={(e) => setRitualHours(Number(e.target.value))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{sprint ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
