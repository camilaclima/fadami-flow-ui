import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Briefcase, Award, Puzzle, Monitor, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllTeamMembers, useAddTeamMember, useUpdateTeamMember, useToggleTeamMember } from "@/hooks/useTeamMembers";

// Importe corrigido para o nome exato do arquivo e adicionando a extensão para evitar erro de resolução do Vite
import { TeamMemberFormModal } from "../components/TeamMemberFormModal";

import { TEAM_ROLE_LABELS, SENIORITY_LABELS, SPECIALTY_LABELS } from "@/types/sprint";
import type { TeamMember } from "@/types/sprint";

export default function TeamMembersPage() {
  const { data: list = [], isLoading } = useAllTeamMembers();
  const addMutation = useAddTeamMember();
  const updateMutation = useUpdateTeamMember();
  const toggleMutation = useToggleTeamMember();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // ID padrão para o coordenador
  const COORDINATOR_ID = "00000000-0000-0000-0000-000000000000";

  const handleSave = (data: any) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, ...data });
    } else {
      addMutation.mutate(data);
    }
    setModalOpen(false);
  };

  const handleToggle = (id: string, active: boolean) => {
    toggleMutation.mutate({ id, active });
  };

  if (isLoading) {
    return (
      <div className="p-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[250px] w-full rounded-[28px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Equipe & Capacity</h1>
          <p className="text-sm text-muted-foreground font-medium">Gestão de talentos e disponibilidade do time</p>
        </div>
        <Button
          className="rounded-xl gap-2 font-black uppercase text-xs h-11 px-6 shadow-lg hover:shadow-primary/20"
          onClick={() => {
            setEditingMember(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Adicionar Membro
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-[32px] border-2 border-dashed border-muted p-20 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
            Nenhum colaborador cadastrado
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <div
              key={c.id}
              className={`bg-card rounded-[28px] shadow-sm border p-6 flex flex-col gap-5 transition-all hover:shadow-xl hover:-translate-y-1 ${
                !c.active ? "opacity-60 grayscale bg-muted/30" : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shrink-0 border border-primary/10">
                  {c.name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-foreground truncate text-lg tracking-tight uppercase leading-none mb-1">
                    {c.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-black text-primary uppercase">
                      {c.daily_capacity_hours}h / dia
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-lg text-[9px] font-black uppercase px-2 py-1">
                  {TEAM_ROLE_LABELS[c.role as keyof typeof TEAM_ROLE_LABELS] || c.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-lg text-[9px] font-black uppercase px-2 py-1 border-primary/20 text-primary"
                >
                  {SENIORITY_LABELS[c.seniority as keyof typeof SENIORITY_LABELS] || c.seniority}
                </Badge>
                <Badge
                  className="bg-foreground/5 text-foreground border-foreground/10 rounded-lg text-[9px] font-black uppercase px-2 py-1"
                  variant="outline"
                >
                  {SPECIALTY_LABELS[c.specialty as keyof typeof SPECIALTY_LABELS] || c.specialty}
                </Badge>
              </div>

              <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Monitor className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase">Foco:</span>
                </div>
                <span className="text-[10px] font-black uppercase text-foreground truncate max-w-[100px]">
                  {c.product_id ? "Projeto Ativo" : "Global"}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 mt-auto border-t border-border/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl flex-1 gap-2 text-[10px] font-black uppercase hover:bg-primary/10"
                  onClick={() => {
                    setEditingMember(c);
                    setModalOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={`rounded-xl px-4 h-10 ${c.active ? "text-emerald-500 hover:bg-emerald-500/10" : "text-rose-500 hover:bg-rose-500/10"}`}
                  onClick={() => handleToggle(c.id, c.active)}
                >
                  {c.active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamMemberFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={editingMember}
        onSave={handleSave}
        coordinatorId={COORDINATOR_ID}
      />
    </div>
  );
}
