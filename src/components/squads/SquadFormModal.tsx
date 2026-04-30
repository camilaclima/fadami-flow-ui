import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useActiveProducts } from "@/hooks/useProducts";
import { useProfiles } from "@/hooks/useProfiles";
import { useSaveSquad, type Squad } from "@/hooks/useSquads";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  squad?: Squad | null;
}

export function SquadFormModal({ open, onOpenChange, squad }: Props) {
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: products = [] } = useActiveProducts();
  const { data: profiles = [] } = useProfiles();
  const save = useSaveSquad();

  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState<string>("__none__");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(squad?.name ?? "");
      setLeaderId(squad?.leader_profile_id ?? "__none__");
      setDescription(squad?.description ?? "");
      setMemberIds(squad?.member_ids ?? []);
      setProductIds(squad?.product_ids ?? []);
    }
  }, [open, squad]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome da squad"); return; }
    if (productIds.length === 0) { toast.error("Vincule ao menos um produto"); return; }
    await save.mutateAsync({
      id: squad?.id,
      name: name.trim(),
      leader_profile_id: leaderId === "__none__" ? null : leaderId,
      description: description.trim(),
      member_ids: memberIds,
      product_ids: productIds,
      active: squad?.active ?? true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{squad ? "Editar Squad" : "Nova Squad"}</DialogTitle>
          <DialogDescription>Defina líder, membros e produtos vinculados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Squad *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Squad Alpha" />
            </div>
            <div className="space-y-2">
              <Label>Líder (usuário)</Label>
              <Select value={leaderId} onValueChange={setLeaderId}>
                <SelectTrigger><SelectValue placeholder="Selecione um líder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem líder definido</SelectItem>
                  {profiles.filter((p) => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} {p.email ? `· ${p.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Propósito / objetivo da squad..." />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Membros da Squad</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
              {teamMembers.length === 0 && <span className="text-sm text-muted-foreground">Nenhum colaborador cadastrado</span>}
              {teamMembers.map((m) => {
                const active = memberIds.includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggle(memberIds, setMemberIds, m.id)}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-border")}>
                    {active && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Package className="h-4 w-4" /> Produtos Vinculados *</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
              {products.length === 0 && <span className="text-sm text-muted-foreground">Nenhum produto cadastrado</span>}
              {products.map((p) => {
                const active = productIds.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggle(productIds, setProductIds, p.id)}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-border")}>
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                    {active && <CheckCircle2 className="h-3 w-3" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
            {productIds.length > 0 && <Badge variant="secondary" className="text-xs">{productIds.length} produto(s) selecionado(s)</Badge>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
