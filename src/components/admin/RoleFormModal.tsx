import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/types/admin";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role?: Role | null;
  onSave: (title: string) => void;
}

export function RoleFormModal({ open, onOpenChange, role, onSave }: Props) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(role?.title ?? "");
  }, [role, open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave(title.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título do Cargo</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Analista Sênior" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
