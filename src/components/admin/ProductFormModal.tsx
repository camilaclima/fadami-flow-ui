import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Product } from "@/hooks/useProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product | null;
  onSave: (data: { name: string; description: string; color: string }) => void;
}

const COLORS = [
  "hsl(243 75% 59%)", "hsl(160 84% 39%)", "hsl(38 92% 50%)",
  "hsl(340 82% 52%)", "hsl(200 98% 39%)", "hsl(280 68% 55%)",
];

export function ProductFormModal({ open, onOpenChange, product, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setColor(product.color);
    } else {
      setName("");
      setDescription("");
      setColor(COLORS[0]);
    }
  }, [product, open]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
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
