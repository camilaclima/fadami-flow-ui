import { useClients, type Client } from "@/hooks/useClients";
import { useBacklogs } from "@/hooks/useBacklogs";
import { Users, Mail, Phone, User } from "lucide-react";
import { motion } from "framer-motion";

export default function ClientsPage() {
  const { data: clients = [] } = useClients();
  const { data: backlogs = [] } = useBacklogs();

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">Seus clientes e parceiros</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client, i) => {
          const count = backlogs.filter((b) => b.client_id === client.id).length;
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 hover-lift"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</p>
                </div>
              </div>
              {client.contact_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><User className="w-3 h-3" />{client.contact_name}</p>
              )}
              {client.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Phone className="w-3 h-3" />{client.phone}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">{count} backlogs vinculados</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
