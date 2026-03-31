import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, Mail, Building2, MapPin, FileText, Pencil, Trash2, Check, X } from "lucide-react";
import { useDeleteContact, useUpdateContact, type ClientContact } from "@/hooks/useClientContacts";
import type { Client } from "@/hooks/useClients";

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client | null;
  contacts: ClientContact[];
}

export function ClientDetailModal({ open, onOpenChange, client, contacts }: Props) {
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientContact>>({});

  if (!client) return null;

  const startEdit = (c: ClientContact) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, phone: c.phone, email: c.email, concession: c.concession, area: c.area, description: c.description });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateContact.mutateAsync({ id: editingId, ...editForm });
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    await deleteContact.mutateAsync(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {client.name}
          </DialogTitle>
          <DialogDescription>{contacts.length} contato{contacts.length !== 1 ? "s" : ""} cadastrado{contacts.length !== 1 ? "s" : ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 py-2 pr-1">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum contato cadastrado.</p>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="bg-secondary/50 rounded-xl p-4 space-y-2 border border-border/40">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nome" value={editForm.name ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="text-sm h-8" />
                      <Input placeholder="(99) 99999-9999" value={editForm.phone ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))} className="text-sm h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="E-mail" value={editForm.email ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="text-sm h-8" />
                      <Input placeholder="Concessão" value={editForm.concession ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, concession: e.target.value }))} className="text-sm h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Área" value={editForm.area ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, area: e.target.value }))} className="text-sm h-8" />
                      <Input placeholder="Descrição" value={editForm.description ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className="text-sm h-8" />
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 px-2 text-xs"><X className="w-3 h-3 mr-1" />Cancelar</Button>
                      <Button size="sm" onClick={saveEdit} className="h-7 px-2 text-xs"><Check className="w-3 h-3 mr-1" />Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">{c.name || "Sem nome"}</span>
                        {c.area && <Badge variant="secondary" className="text-[10px]">{c.area}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(c)} title="Editar">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(c.id)} title="Remover">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                      )}
                      {c.concession && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.concession}</span>
                      )}
                      {c.description && (
                        <span className="flex items-center gap-1 col-span-2"><FileText className="w-3 h-3" />{c.description}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
