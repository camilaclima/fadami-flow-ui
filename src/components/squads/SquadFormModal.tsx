import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Users, Package, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useTeamMembers, useAddTeamMember } from "@/hooks/useTeamMembers";
import { useActiveProducts } from "@/hooks/useProducts";
import { useProfiles } from "@/hooks/useProfiles";
import { useSaveSquad, type Squad } from "@/hooks/useSquads";
import { useAuth } from "@/contexts/AuthContext";

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
  const addMember = useAddTeamMember();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState<string>("__none__");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState("");

  useEffect(() => {
    if (open) {
      if (squad) {
        setName(squad.name ?? "");
        setLeaderId(squad.leader_profile_id ?? "__none__");
        setDescription(squad.description ?? "");
        setMemberIds(squad.member_ids ?? []);
        setProductIds(squad.product_ids ?? []);
      } else {
        // Reset total para Nova Squad
        setName("");
        setLeaderId("__none__");
        setDescription("");
        setMemberIds([]);
        setProductIds([]);
      }
      setNewMemberName("");
    }
  }, [open, squad]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const handleAddNewMember = async () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      toast.error("Informe o nome do membro");
      return;
    }
    if (!user?.id) {
      toast.error("Sessão inválida");
      return;
    }
    try {
      const created: any = await addMember.mutateAsync({
        name: trimmed,
        role: "dev",
        seniority: "pleno",
        specialty: "fullstack",
        daily_capacity_hours: 8,
        coordinator_id: user.id,
        product_id: productIds[0] ?? null,
      } as any);
      setNewMemberName("");
      if (created?.id) {
        setMemberIds((prev) => [...prev, created.id]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao adicionar membro");
    }
  };

  const handleUnselectMember = (id: string) => {
    setMemberIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome da squad");
      return;
    }
    if (productIds.length === 0) {
      toast.error("Vincule ao menos um produto");
      return;
    }

    try {
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
      toast.success("Squad salva com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao salvar squad");
    }
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um líder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem líder definido</SelectItem>
                  {profiles
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Propósito / objetivo da squad..."
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Membros da Squad
            </Label>
            <p className="text-xs text-muted-foreground">Adicione os membros que farão parte desta squad.</p>
            <div className="flex gap-2">
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nome do novo membro"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewMember();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddNewMember} disabled={addMember.isPending}>
                {addMember.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
              {/* FILTRO CRÍTICO: Só mostra quem foi selecionado (memberIds) */}
              {memberIds.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhum membro adicionado a esta squad</span>
              )}
              {teamMembers
                .filter((m) => memberIds.includes(m.id))
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1 rounded-full border bg-primary text-primary-foreground border-primary overflow-hidden"
                  >
                    <span className="px-3 py-1 text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {m.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnselectMember(m.id)}
                      className="px-1.5 py-1 border-l border-primary-foreground/30 opacity-70 hover:opacity-100 hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Produtos Vinculados *
            </Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3 min-h-[44px]">
              {products.map((p) => {
                const active = productIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(productIds, setProductIds, p.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-border",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                    {active && <CheckCircle2 className="h-3 w-3" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
