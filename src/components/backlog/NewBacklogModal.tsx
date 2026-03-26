import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBacklogStore } from "@/store/backlogStore";
import type { Thermometer } from "@/types/backlog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewBacklogModal({ open, onOpenChange }: Props) {
  const { products, clients, addBacklog } = useBacklogStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [clientId, setClientId] = useState("");
  const [thermometer, setThermometer] = useState<Thermometer>("medium");

  const thermoOptions: { value: Thermometer; label: string; emoji: string }[] = [
    { value: "low", label: "Baixo", emoji: "🔵" },
    { value: "medium", label: "Médio", emoji: "🟡" },
    { value: "high", label: "Alto", emoji: "🔴" },
  ];

  const handleSubmit = () => {
    if (!title.trim() || !productId) {
      toast.error("Preencha o título e selecione um produto.");
      return;
    }
    addBacklog({
      title: title.trim(),
      description: description.trim(),
      productId,
      clientId: clientId || undefined,
      thermometer,
      createdBy: "Você",
    });
    toast.success("Backlog criado com sucesso!");
    setTitle("");
    setDescription("");
    setProductId("");
    setClientId("");
    setThermometer("medium");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Novo Backlog</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Implementar autenticação..."
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o backlog..."
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Produto *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Opcional</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Termômetro</label>
            <div className="flex gap-2">
              {thermoOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setThermometer(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    thermometer === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Criar Backlog
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
