import { useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import { UserFormModal } from "@/components/admin/UserFormModal";
import { UserPlus, Pencil, Copy, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { AppUser } from "@/types/admin";
import { motion } from "framer-motion";

export default function UsersPage() {
  const { users, products, roles, accessGroups, addUser, updateUser, toggleUserActive, getCloneData } = useAdminStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [cloneData, setCloneData] = useState<Partial<AppUser> | null>(null);

  const handleNew = () => { setEditing(null); setCloneData(null); setModalOpen(true); };
  const handleEdit = (u: AppUser) => { setEditing(u); setCloneData(null); setModalOpen(true); };
  const handleClone = (u: AppUser) => {
    const data = getCloneData(u.id);
    setEditing(null);
    setCloneData(data);
    setModalOpen(true);
  };

  const handleSave = (data: { firstName: string; lastName: string; email: string; productId: string; roleId: string; groupId: string }): string | void => {
    if (editing) {
      updateUser(editing.id, data);
      toast.success("Usuário atualizado!");
      return;
    }
    const pwd = addUser(data);
    toast.success("Usuário criado!");
    return pwd;
  };

  const handleToggle = (u: AppUser) => {
    toggleUserActive(u.id);
    toast.success(u.active ? "Usuário inativado" : "Usuário reativado");
  };

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "-";
  const getRoleName = (id: string) => roles.find((r) => r.id === id)?.title ?? "-";
  const getGroupName = (id: string) => accessGroups.find((g) => g.id === id)?.name ?? "-";

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
            {users.map((u) => (
              <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                <TableCell className="font-medium text-foreground">{u.firstName} {u.lastName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{getProductName(u.productId)}</TableCell>
                <TableCell className="text-sm">{getRoleName(u.roleId)}</TableCell>
                <TableCell className="text-sm">{getGroupName(u.groupId)}</TableCell>
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

      <UserFormModal open={modalOpen} onOpenChange={setModalOpen} user={editing} cloneData={cloneData} onSave={handleSave} />
    </div>
  );
}
