import { useState } from "react";
import { useAccessGroups, useAddAccessGroup, useUpdateAccessGroup, useDeleteAccessGroup, type AccessGroup } from "@/hooks/useAccessGroups";
import { AccessGroupFormModal } from "@/components/admin/AccessGroupFormModal";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SystemPage } from "@/types/admin";
import { motion } from "framer-motion";

export default function AccessGroupsPage() {
  const { data: accessGroups = [] } = useAccessGroups();
  const addGroup = useAddAccessGroup();
  const updateGroup = useUpdateAccessGroup();
  const deleteGroup = useDeleteAccessGroup();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccessGroup | null>(null);

  const handleNew = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (g: AccessGroup) => { setEditing(g); setModalOpen(true); };

  const handleSave = (name: string, permissions: SystemPage[]) => {
    if (editing) {
      updateGroup.mutate({ id: editing.id, name, permissions });
    } else {
      addGroup.mutate({ name, permissions });
    }
  };

  const handleDelete = (g: AccessGroup) => {
    deleteGroup.mutate(g.id);
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os grupos e suas permissões de tela</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Grupo
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessGroups.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{g.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{g.permissions.length} telas</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(g)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(g)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <AccessGroupFormModal open={modalOpen} onOpenChange={setModalOpen} group={editing} onSave={handleSave} />
    </div>
  );
}
