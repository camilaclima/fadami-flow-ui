import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEAM_ROLE_LABELS, SENIORITY_LABELS, SPECIALTY_LABELS } from "@/types/sprint";
import type { TeamRole, Seniority, Specialty, TeamMember } from "@/types/sprint";
import { useProducts } from "@/hooks/useProducts";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member: TeamMember | null;
  onSave: (data: {
    name: string;
    role: TeamRole;
    seniority: Seniority;
    specialty: Specialty;
    daily_capacity_hours: number;
    product_id: string | null;
    coordinator_id: string;
  }) => void;
  coordinatorId: string;
}

export function TeamMemberFormModal({ open, onOpenChange, member, onSave, coordinatorId }: Props) {
  const { data: products = [] } = useProducts();
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("dev");
  const [seniority, setSeniority] = useState<Seniority>("pleno");
  const [specialty, setSpecialty] = useState<Specialty>("fullstack");
  const [hours, setHours] = useState(8);
  const [productId, setProductId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRole((member?.role as TeamRole) ?? "dev");
      setSeniority((member?.seniority as Seniority) ?? "pleno");
      setSpecialty((member?.specialty as Specialty) ?? "fullstack");
      setHours(member?.daily_capacity_hours ?? 8);
      setProductId(member?.product_id ?? "");
    }
  }, [open, member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role,
      seniority,
      specialty,
      daily_capacity_hours: hours,
      product_id: productId || null,
      coordinator_id: coordinatorId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do colaborador" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAM_ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Senioridade</Label>
              <Select value={seniority} onValueChange={(v) => setSeniority(v as Seniority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SENIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Especialidade</Label>
              <Select value={specialty} onValueChange={(v) => setSpecialty(v as Specialty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SPECIALTY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacidade Diária (h)</Label>
              <Input type="number" min={1} max={24} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Produto</Label>
            <Select value={productId || "__none__"} onValueChange={(v) => setProductId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{member ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
