import { useState } from "react";
import { useClients, type Client } from "@/hooks/useClients";
import { useAllClientContacts } from "@/hooks/useClientContacts";
import { useBacklogs } from "@/hooks/useBacklogs";
import { Users, Mail, Phone, User, Plus, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientFormModal } from "@/components/admin/ClientFormModal";
import { ClientDetailModal } from "@/components/admin/ClientDetailModal";

export default function ClientsPage() {
  const { data: clients = [] } = useClients();
  const { data: allContacts = [] } = useAllClientContacts();
  const { data: backlogs = [] } = useBacklogs();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  const contactsFor = (clientId: string) => allContacts.filter((c) => c.client_id === clientId);

  const handleNew = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(client);
    setFormOpen(true);
  };
  const handleCardClick = (client: Client) => {
    setDetailClient(client);
    setDetailOpen(true);
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Seus clientes e parceiros</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client, i) => {
          const contacts = contactsFor(client.id);
          const backlogCount = backlogs.filter((b) => b.client_id === client.id).length;
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleCardClick(client)}
              className="bg-card border border-border rounded-2xl p-5 hover-lift cursor-pointer group relative"
            >
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                onClick={(e) => handleEdit(client, e)}
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
                  {client.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />{client.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {contacts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    <User className="w-3 h-3 mr-1" />
                    {contacts.length === 1 ? "1 contato" : `${contacts.length} contatos cadastrados`}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {backlogCount} backlogs
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </div>

      <ClientFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        existingContacts={editing ? contactsFor(editing.id) : undefined}
      />

      <ClientDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={detailClient}
        contacts={detailClient ? contactsFor(detailClient.id) : []}
      />
    </div>
  );
}
