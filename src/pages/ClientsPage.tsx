import { useState } from "react";
import { useClients, type Client } from "@/hooks/useClients";
import { useAllClientContacts, useToggleClientActive } from "@/hooks/useClientContacts";
import { useBacklogs } from "@/hooks/useBacklogs";
import { Users, User, Plus, Pencil, Power } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ClientFormModal } from "@/components/admin/ClientFormModal";
import { ClientDetailModal } from "@/components/admin/ClientDetailModal";

export default function ClientsPage() {
  const { data: clients = [] } = useClients();
  const { data: allContacts = [] } = useAllClientContacts();
  const { data: backlogs = [] } = useBacklogs();
  const toggleActive = useToggleClientActive();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const contactsFor = (clientId: string) => allContacts.filter((c) => c.client_id === clientId);

  const filteredClients = clients.filter((c) => showInactive || c.active !== false);

  const handleNew = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(client);
    setFormOpen(true);
  };
  const handleToggleActive = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleActive.mutate({ id: client.id, active: !client.active });
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="text-xs text-muted-foreground">Mostrar inativos</Label>
          </div>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client, i) => {
          const contacts = contactsFor(client.id);
          const backlogCount = backlogs.filter((b) => b.client_id === client.id).length;
          const isInactive = client.active === false;
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleCardClick(client)}
              className={`bg-card border border-border rounded-2xl p-5 hover-lift cursor-pointer group relative ${isInactive ? "opacity-50" : ""}`}
            >
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => handleToggleActive(client, e)}
                  title={isInactive ? "Reativar" : "Desativar"}
                >
                  <Power className={`w-3.5 h-3.5 ${isInactive ? "text-green-500" : "text-destructive"}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => handleEdit(client, e)}
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
                  {isInactive && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Inativo</Badge>}
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
