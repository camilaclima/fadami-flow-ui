import { useState, useEffect } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Briefcase, Award, Puzzle, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  toggleCollaborator,
  seedCollaborators,
} from "@/data/collaborators-store";
import { Collaborator, Senioridade, SENIORITY_LABELS } from "@/types/sprint"; // Ajustado para SENIORITY_LABELS
import { CollaboratorModal } from "@/components/CollaboratorModal";
import { toast } from "sonner";

export default function TeamMembersPage() {
  const [list, setList] = useState<Collaborator[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | undefined>();

  const refresh = () => setList(getCollaborators());

  useEffect(() => {
    seedCollaborators();
    refresh();
  }, []);

  const handleSave = (data: any) => {
    if (editing) {
      updateCollaborator(editing.id, data);
      toast.success("Colaborador atualizado com sucesso");
    } else {
      createCollaborator(data);
      toast.success("Novo colaborador adicionado à equipe");
    }
    setEditing(undefined);
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleCollaborator(id);
    refresh();
    toast.success("Status de disponibilidade alterado");
  };

  return (
    <div className="fade-in space-y-8 pb-10">
      {/* HEADER DA PÁGINA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Equipe & Capacity</h1>
          <p className="text-sm text-muted-foreground font-medium">Gestão de talentos e disponibilidade do time</p>
        </div>
        <Button
          className="rounded-xl gap-2 font-black uppercase text-xs h-11 px-6 shadow-lg hover:shadow-primary/20 transition-all"
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Adicionar Membro
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-[32px] border-2 border-dashed border-muted p-20 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">
            Nenhum colaborador na base
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <div
              key={c.id}
              className={`bg-card rounded-[28px] shadow-sm border p-6 flex flex-col gap-5 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 ${
                !c.ativo ? "opacity-60 grayscale bg-muted/30" : "border-border"
              }`}
            >
              {/* PERFIL E CAPACIDADE */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shrink-0 border border-primary/10 shadow-inner">
                    {c.nome.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-foreground truncate text-lg tracking-tight uppercase leading-none mb-1">
                      {c.nome}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                        {c.capacidadeSemanal}h / semana
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ESPECIALIDADES (TAGS) */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-lg text-[9px] font-black uppercase gap-1.5 px-2.5 py-1 bg-secondary/50"
                >
                  <Briefcase className="w-3 h-3" /> {c.funcao}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-lg text-[9px] font-black uppercase gap-1.5 px-2.5 py-1 border-primary/20 text-primary"
                >
                  <Award className="w-3 h-3" /> {SENIORITY_LABELS[c.senioridade]}
                </Badge>
                <Badge
                  className="bg-foreground/5 text-foreground border-foreground/10 rounded-lg text-[9px] font-black uppercase gap-1.5 px-2.5 py-1"
                  variant="outline"
                >
                  <Puzzle className="w-3 h-3" /> {c.especialidade || "Full-stack"}
                </Badge>
              </div>

              {/* DETALHES DE PROJETO */}
              <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase">Produto:</span>
                </div>
                <span className="text-[10px] font-black uppercase text-foreground">{c.produto || "Global"}</span>
              </div>

              {/* AÇÕES E STATUS */}
              <div className="flex items-center gap-2 pt-2 mt-auto border-t border-border/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl flex-1 gap-2 text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary transition-colors h-10"
                  onClick={() => {
                    setEditing(c);
                    setModalOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={`rounded-xl px-4 h-10 transition-all ${
                    c.ativo ? "text-emerald-500 hover:bg-emerald-500/10" : "text-rose-500 hover:bg-rose-500/10"
                  }`}
                  onClick={() => handleToggle(c.id)}
                >
                  {c.ativo ? (
                    <ToggleRight className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 stroke-[2.5]" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CollaboratorModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
