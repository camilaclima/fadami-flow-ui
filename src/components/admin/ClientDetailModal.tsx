import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Building2, MapPin, FileText } from "lucide-react";
import type { ClientContact } from "@/hooks/useClientContacts";
import type { Client } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client | null;
  contacts: ClientContact[];
}

export function ClientDetailModal({ open, onOpenChange, client, contacts }: Props) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {client.name}
          </DialogTitle>
          <DialogDescription>{client.email || "Sem e-mail principal"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 py-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum contato cadastrado.</p>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="bg-secondary/50 rounded-xl p-4 space-y-2 border border-border/40">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{c.name || "Sem nome"}</span>
                  {c.area && <Badge variant="secondary" className="text-[10px]">{c.area}</Badge>}
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
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
