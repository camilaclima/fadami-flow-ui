import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useAddClient, useUpdateClient, type ClientContact } from "@/hooks/useClientContacts";
import type { Client } from "@/hooks/useClients";

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  concession: string;
  area: string;
  description: string;
}

const emptyContact = (): ContactForm => ({ name: "", phone: "", email: "", concession: "", area: "", description: "" });

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
  existingContacts?: ClientContact[];
}

export function ClientFormModal({ open, onOpenChange, client, existingContacts }: Props) {
  const addClient = useAddClient();
  const updateClient = useUpdateClient();

  const [name, setName] = useState("");
  const [contacts, setContacts] = useState<ContactForm[]>([emptyContact()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setContacts(
        existingContacts && existingContacts.length > 0
          ? existingContacts.map((c) => ({
              name: c.name,
              phone: c.phone,
              email: c.email,
              concession: c.concession,
              area: c.area,
              description: c.description,
            }))
          : [emptyContact()],
      );
    } else {
      setName("");
      setContacts([emptyContact()]);
    }
  }, [client, existingContacts, open]);

  const addContactRow = () => setContacts((prev) => [...prev, emptyContact()]);
  const removeContactRow = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: keyof ContactForm, value: string) => {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: field === "phone" ? formatPhone(value) : value } : c)),
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const validContacts = contacts.filter((c) => c.name.trim() || c.email.trim());
      if (client) {
        await updateClient.mutateAsync({ id: client.id, name: name.trim(), contacts: validContacts });
      } else {
        await addClient.mutateAsync({ name: name.trim(), contacts: validContacts });
      }
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* AJUSTE: Aumentado para 700px e adicionado w-[95vw] para evitar cortes laterais */}
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {client ? "Atualize os dados do cliente." : "Preencha os dados do cliente e seus contatos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 px-1 custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nome do Grupo / Empresa</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              className="h-10"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contatos</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addContactRow}
                className="gap-1 text-xs rounded-xl"
              >
                <Plus className="w-3 h-3" /> Adicionar Contato
              </Button>
            </div>

            {contacts.map((contact, i) => (
              <div key={i} className="bg-secondary/30 rounded-2xl p-4 space-y-3 relative border border-border/60">
                {contacts.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => removeContactRow(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Input
                      placeholder="Nome"
                      value={contact.name}
                      onChange={(e) => updateContact(i, "name", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      placeholder="(99) 99999-9999"
                      value={contact.phone}
                      onChange={(e) => updateContact(i, "phone", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Input
                      placeholder="E-mail"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(i, "email", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      placeholder="Concessão"
                      value={contact.concession}
                      onChange={(e) => updateContact(i, "concession", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Input
                      placeholder="Área"
                      value={contact.area}
                      onChange={(e) => updateContact(i, "area", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      placeholder="Descrição curta"
                      value={contact.description}
                      onChange={(e) => updateContact(i, "description", e.target.value)}
                      className="text-sm h-10 bg-background/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="rounded-xl px-8">
            {saving ? "Salvando..." : client ? "Salvar Alterações" : "Criar Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
