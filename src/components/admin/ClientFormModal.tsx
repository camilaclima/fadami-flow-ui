import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const [email, setEmail] = useState("");
  const [contacts, setContacts] = useState<ContactForm[]>([emptyContact()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email);
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
          : [emptyContact()]
      );
    } else {
      setName("");
      setEmail("");
      setContacts([emptyContact()]);
    }
  }, [client, existingContacts, open]);

  const addContactRow = () => setContacts((prev) => [...prev, emptyContact()]);
  const removeContactRow = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: keyof ContactForm, value: string) => {
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const validContacts = contacts.filter((c) => c.name.trim() || c.email.trim());
      if (client) {
        await updateClient.mutateAsync({ id: client.id, name: name.trim(), email: email.trim(), contacts: validContacts });
      } else {
        await addClient.mutateAsync({ name: name.trim(), email: email.trim(), contacts: validContacts });
      }
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>{client ? "Atualize os dados do cliente." : "Preencha os dados do cliente e seus contatos."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nome do Grupo / Empresa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>E-mail Principal</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Contatos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addContactRow} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Adicionar Contato
              </Button>
            </div>

            {contacts.map((contact, i) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-3 space-y-2 relative border border-border/40">
                {contacts.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeContactRow(i)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome" value={contact.name} onChange={(e) => updateContact(i, "name", e.target.value)} className="text-sm h-9" />
                  <Input placeholder="Telefone" value={contact.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} className="text-sm h-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="E-mail" type="email" value={contact.email} onChange={(e) => updateContact(i, "email", e.target.value)} className="text-sm h-9" />
                  <Input placeholder="Concessão" value={contact.concession} onChange={(e) => updateContact(i, "concession", e.target.value)} className="text-sm h-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Área" value={contact.area} onChange={(e) => updateContact(i, "area", e.target.value)} className="text-sm h-9" />
                  <Input placeholder="Descrição curta" value={contact.description} onChange={(e) => updateContact(i, "description", e.target.value)} className="text-sm h-9" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? "Salvando..." : client ? "Salvar" : "Criar Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
