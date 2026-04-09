import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useProducts } from "@/hooks/useProducts";
import { useRoles } from "@/hooks/useRoles";
import { useAccessGroups } from "@/hooks/useAccessGroups";
import { useProfileProducts, useProfileGroups } from "@/hooks/useProfileRelations";
import { useState } from "react";
import { UserPlus, Pencil, Copy, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useToggleProfileActive } from "@/hooks/useProfiles";
import { UserFormModalSupabase } from "@/components/admin/UserFormModalSupabase";

export default function UsersPage() {
  const { data: profiles = [] } = useProfiles();
  const { data: products = [] } = useProducts();
  const { data: roles = [] } = useRoles();
  const { data: accessGroups = [] } = useAccessGroups();
  const { data: profileProducts = [] } = useProfileProducts();
  const { data: profileGroups = [] } = useProfileGroups();
  const toggleActive = useToggleProfileActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [cloneData, setCloneData] = useState<any | null>(null);

  const handleNew = () => {
    setEditing(null);
    setCloneData(null);
    setModalOpen(true);
  };

  const handleEdit = (u: Profile) => {
    setEditing(u);
    setCloneData(null);
    setModalOpen(true);
  };

  const handleClone = (u: Profile) => {
    setEditing(null);

    // Busca os IDs vinculados ao usuário que será clonado
    const selectedProductIds = profileProducts.filter((pp) => pp.profile_id === u.id).map((pp) => pp.product_id);

    const selectedGroupIds = profileGroups.filter((pg) => pg.profile_id === u.id).map((pg) => pg.group_id);

    // Passa o cargo e as listas de IDs para o cloneData
    setCloneData({
      role_id: u.role_id,
      selectedProductIds,
      selectedGroupIds,
    });

    setModalOpen(true);
  };

  const handleToggle = (u: Profile) => {
    toggleActive.mutate({ id: u.id, active: u.active });
  };

  const getProductNames = (profileId: string) => {
    const ids = profileProducts.filter((pp) => pp.profile_id === profileId).map((pp) => pp.product_id);
    return (
      ids
        .map((id) => products.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(", ") || "-"
    );
  };

  const getRoleName = (id: string | null) => roles.find((r) => r.id === id)?.title ?? "-";

  const getGroupNames = (profileId: string) => {
    const ids = profileGroups.filter((pg) => pg.profile_id === profileId).map((pg) => pg.group_id);
    return (
      ids
        .map((id) => accessGroups.find((g) => g.id === id)?.name)
        .filter(Boolean)
        .join(", ") || "-"
    );
  };

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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((u) => (
              <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                <TableCell className="font-medium text-foreground">
                  {u.first_name} {u.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-sm max-w-[160px] truncate">{getProductNames(u.id)}</TableCell>
                <TableCell className="text-sm">{getRoleName(u.role_id)}</TableCell>
                <TableCell className="text-sm max-w-[160px] truncate">{getGroupNames(u.id)}</TableCell>
                <TableCell>
                  <Badge
                    variant={u.active ? "default" : "secondary"}
                    className={
                      u.active
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(u)}
                      title={u.active ? "Inativar" : "Ativar"}
                    >
                      {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <UserFormModalSupabase open={modalOpen} onOpenChange={setModalOpen} profile={editing} cloneData={cloneData} />
    </div>
  );
}
