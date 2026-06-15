import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown } from "lucide-react";
import { TEAM_ROLE_LABELS, SENIORITY_LABELS, SPECIALTY_LABELS } from "@/types/sprint";
import type { TeamRole, Seniority, Specialty, TeamMember } from "@/types/sprint";
import { useActiveProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";

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
    product_ids: string[];
    coordinator_id: string;
  }) => void;
  coordinatorId: string;
}

export function TeamMemberFormModal({ open, onOpenChange, member, onSave, coordinatorId }: Props) {
  const { data: products = [] } = useActiveProducts();
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("dev");
  const [seniority, setSeniority] = useState<Seniority>("pleno");
  const [specialty, setSpecialty] = useState<Specialty>("fullstack");
  const [hours, setHours] = useState(8);
  const [productIds, setProductIds] = useState<string[]>([]);

  const requiresSpecialty = role === "dev" || role === "devops";

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRole((member?.role as TeamRole) ?? "dev");
      setSeniority((member?.seniority as Seniority) ?? "pleno");
      setSpecialty((member?.specialty as Specialty) ?? "fullstack");
      setHours(member?.daily_capacity_hours ?? 8);
      setProductIds([]);
      if (member?.id) {
        (supabase.from("team_member_products" as any) as any)
          .select("product_id")
          .eq("team_member_id", member.id)
          .then(({ data }: any) => {
            const ids = (data ?? []).map((r: any) => r.product_id).filter(Boolean);
            if (ids.length === 0 && member.product_id) {
              setProductIds([member.product_id]);
            } else {
              setProductIds(ids);
            }
          });
      }
    }
  }, [open, member]);

  useEffect(() => {
    if (requiresSpecialty && specialty === "na") {
      setSpecialty("fullstack");
    } else if (!requiresSpecialty) {
      setSpecialty("na");
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role,
      seniority,
      specialty,
      daily_capacity_hours: hours,
      product_id: productIds[0] ?? null,
      product_ids: productIds,
      coordinator_id: coordinatorId,
    });
    onOpenChange(false);
  };

  const toggleProduct = (id: string) => {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const selectedNames = products.filter((p) => productIds.includes(p.id)).map((p) => p.name);

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
              <Select value={specialty} onValueChange={(v) => setSpecialty(v as Specialty)} disabled={!requiresSpecialty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {requiresSpecialty ? (
                    Object.entries(SPECIALTY_LABELS)
                      .filter(([k]) => k !== "na")
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))
                  ) : (
                    <SelectItem value="na">Não Aplicável</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacidade Diária (h)</Label>
              <Input type="number" min={1} max={24} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Projetos</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal">
                  <span className="flex flex-wrap gap-1 items-center text-left">
                    {selectedNames.length === 0 ? (
                      <span className="text-muted-foreground">Selecione os projetos (opcional)</span>
                    ) : (
                      selectedNames.map((n) => (
                        <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
                      ))
                    )}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">Nenhum projeto ativo cadastrado.</p>
                  )}
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                      <Checkbox checked={productIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
