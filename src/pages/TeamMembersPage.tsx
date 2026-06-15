import { useState } from "react";
import { useAllTeamMembers, useAddTeamMember, useUpdateTeamMember, useToggleTeamMember } from "@/hooks/useTeamMembers";
import { TeamMemberFormModal } from "@/components/admin/TeamMemberFormModal";
import { UsersRound, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { TEAM_ROLE_LABELS, SENIORITY_LABELS, SPECIALTY_LABELS } from "@/types/sprint";
import type { TeamMember } from "@/types/sprint";

export default function TeamMembersPage() {
  const { user } = useAuth();
  const { data: members = [] } = useAllTeamMembers();
  const { data: products = [] } = useProducts();
  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const toggleMember = useToggleTeamMember();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const handleNew = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (m: TeamMember) => { setEditing(m); setModalOpen(true); };

  const handleSave = async (data: any) => {
    const { product_ids = [], ...payload } = data;
    let memberId = editing?.id;
    if (editing) {
      await updateMember.mutateAsync({ id: editing.id, ...payload });
    } else {
      const created = await addMember.mutateAsync(payload);
      memberId = (created as any)?.id;
    }
    if (memberId) {
      const { supabase } = await import("@/integrations/supabase/client");
      await (supabase.from("team_member_products" as any) as any)
        .delete()
        .eq("team_member_id", memberId);
      if (product_ids.length > 0) {
        await (supabase.from("team_member_products" as any) as any).insert(
          product_ids.map((pid: string) => ({ team_member_id: memberId, product_id: pid }))
        );
      }
    }
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os colaboradores do seu time</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Colaborador
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Senioridade</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Horas/Dia</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                      <UsersRound className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{TEAM_ROLE_LABELS[m.role as keyof typeof TEAM_ROLE_LABELS] ?? m.role}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{SENIORITY_LABELS[m.seniority as keyof typeof SENIORITY_LABELS] ?? m.seniority}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{SPECIALTY_LABELS[m.specialty as keyof typeof SPECIALTY_LABELS] ?? m.specialty}</Badge>
                </TableCell>
                <TableCell className="text-sm">{m.daily_capacity_hours}h</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.product_id ? productMap[m.product_id] ?? "—" : "—"}</TableCell>
                <TableCell>
                  <Badge variant={m.active ? "default" : "secondary"} className={m.active ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                    {m.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleMember.mutate({ id: m.id, active: m.active })}>
                    {m.active ? "Inativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  Nenhum colaborador cadastrado. Clique em "Novo Colaborador" para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      <TeamMemberFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={editing}
        onSave={handleSave}
        coordinatorId={user?.id ?? ""}
      />
    </div>
  );
}
