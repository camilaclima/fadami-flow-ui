import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useProducts } from "@/hooks/useProducts";
import { useRoles } from "@/hooks/useRoles";
import { useAccessGroups } from "@/hooks/useAccessGroups";
import { useState } from "react";
import { UserPlus, Pencil, Copy, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useUpdateProfile, useToggleProfileActive } from "@/hooks/useProfiles";
import { UserFormModalSupabase } from "@/components/admin/UserFormModalSupabase";

export default function UsersPage() {
  const { data: profiles = [] } = useProfiles();
  const { data: products = [] } = useProducts();
  const { data: roles = [] } = useRoles();
  const { data: accessGroups = [] } = useAccessGroups();
  const updateProfile = useUpdateProfile();
  const toggleActive = useToggleProfileActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [cloneData, setCloneData] = useState<Partial<Profile> | null>(null);

  const handleNew = () => { setEditing(null); setCloneData(null); setModalOpen(true); };
  const handleEdit = (u: Profile) => { setEditing(u); setCloneData(null); setModalOpen(true); };
  const handleClone = (u: Profile) => {
    setEditing(null);
    setCloneData({ product_id: u.product_id, role_id: u.role_id, group_id: u.group_id });
    setModalOpen(true);
  };

  const handleToggle = (u: Profile) => {
    toggleActive.mutate({ id: u.id, active: u.active });
  };

  const getProductName = (id: string | null) => products.find((p) => p.id === id)?.name ?? "-";
  const getRoleName = (id: string | null) => roles.find((r) => r.id === id)?.title ?? "-";
  const getGroupName = (id: string | null) => accessGroups.find((g) => g.id === id)?.name ?? "-";

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os usuários e seus acessos</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <UserPlus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((u) => (
              <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                <TableCell className="font-medium text-foreground">{u.first_name} {u.last_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{getProductName(u.product_id)}</TableCell>
                <TableCell className="text-sm">{getRoleName(u.role_id)}</TableCell>
                <TableCell className="text-sm">{getGroupName(u.group_id)}</TableCell>
                <TableCell>
                  <Badge variant={u.active ? "default" : "secondary"} className={u.active ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                    {u.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(u)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleClone(u)} title="Clonar">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(u)} title={u.active ? "Inativar" : "Ativar"}>
                      {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <UserFormModalSupabase
        open={modalOpen}
        onOpenChange={setModalOpen}
        profile={editing}
        cloneData={cloneData}
      />
    </div>
  );
}
