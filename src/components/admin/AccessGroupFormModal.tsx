import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SYSTEM_PAGES, SYSTEM_PAGE_LABELS } from "@/types/admin";
import type { AccessGroup, SystemPage } from "@/types/admin";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group?: AccessGroup | null;
  onSave: (name: string, permissions: SystemPage[]) => void;
}

export function AccessGroupFormModal({ open, onOpenChange, group, onSave }: Props) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<SystemPage[]>([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setPermissions([...group.permissions]);
    } else {
      setName("");
      setPermissions([]);
    }
  }, [group, open]);

  const togglePermission = (page: SystemPage) => {
    setPermissions((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), permissions);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{group ? "Editar Grupo" : "Novo Grupo de Acesso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do Grupo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Diretoria" />
          </div>
          <div className="space-y-2">
            <Label>Permissões de Tela</Label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {SYSTEM_PAGES.map((page) => (
                <label key={page} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={permissions.includes(page)}
                    onCheckedChange={() => togglePermission(page)}
                  />
                  <span className="text-sm">{SYSTEM_PAGE_LABELS[page]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
