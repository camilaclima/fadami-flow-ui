import { useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import { RoleFormModal } from "@/components/admin/RoleFormModal";
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Role } from "@/types/admin";
import { motion } from "framer-motion";

export default function RolesPage() {
  const { roles, addRole, updateRole, deleteRole } = useAdminStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const handleNew = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (r: Role) => { setEditing(r); setModalOpen(true); };

  const handleSave = (title: string) => {
    if (editing) {
      updateRole(editing.id, title);
      toast.success("Cargo atualizado!");
    } else {
      addRole(title);
      toast.success("Cargo criado!");
    }
  };

  const handleDelete = (r: Role) => {
    deleteRole(r.id);
    toast.success("Cargo removido!");
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cargos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as nomenclaturas organizacionais</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cargo
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título do Cargo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{r.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(r)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <RoleFormModal open={modalOpen} onOpenChange={setModalOpen} role={editing} onSave={handleSave} />
    </div>
  );
}
