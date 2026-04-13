import { useState, useEffect } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Briefcase, Award, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  toggleCollaborator,
  seedCollaborators,
} from "@/data/collaborators-store";
import { Collaborator, Senioridade, SENIORIDADE_LABELS } from "@/types/sprint";
import { CollaboratorModal } from "@/components/CollaboratorModal";
import { toast } from "sonner";

export default function Collaborators() {
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
      toast.success("Colaborador atualizado");
    } else {
      createCollaborator(data);
      toast.success("Colaborador criado");
    }
    setEditing(undefined);
    refresh();
  };

  const handleToggle = (id: string) => {
    toggleCollaborator(id);
    refresh();
    toast.success("Status atualizado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros e a capacidade do seu time</p>
        </div>
        <Button
          className="rounded-xl gap-2 font-bold"
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-3xl border border-dashed p-20 text-center text-muted-foreground">
          Nenhum colaborador cadastrado. Comece adicionando um novo membro.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <div
              key={c.id}
              className={`bg-card rounded-3xl shadow-sm border p-6 flex flex-col gap-4 transition-all hover:shadow-md hover:border-primary/20 ${!c.ativo ? "opacity-60 grayscale" : ""}`}
            >
              {/* Header do Card: Avatar e Nome */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black shrink-0 border border-primary/5">
                  {c.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground truncate text-lg tracking-tight uppercase">{c.nome}</p>
                  <p className="text-xs font-bold text-primary">{c.capacidadeSemanal}h / semana</p>
                </div>
              </div>

              {/* Tags de Informação */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-lg text-[10px] font-bold uppercase gap-1 px-2 py-0.5">
                  <Briefcase className="w-3 h-3" /> {c.funcao}
                </Badge>
                <Badge variant="outline" className="rounded-lg text-[10px] font-bold uppercase gap-1 px-2 py-0.5">
                  <Award className="w-3 h-3" /> {SENIORIDADE_LABELS[c.senioridade]}
                </Badge>
                {/* Aqui entra a Especialidade do modelo novo */}
                <Badge
                  className="bg-primary/5 text-primary border-primary/10 rounded-lg text-[10px] font-bold uppercase gap-1 px-2 py-0.5"
                  variant="outline"
                >
                  <Puzzle className="w-3 h-3" /> {c.especialidade || "Full-stack"}
                </Badge>
              </div>

              {/* Info Adicional: Produto e Status */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="text-[10px] font-black text-muted-foreground uppercase">
                  Produto: <span className="text-foreground">{c.produto || "N/A"}</span>
                </div>
                <Badge
                  className={`rounded-full text-[9px] font-black uppercase px-3 ${c.ativo ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}
                  variant="outline"
                >
                  {c.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Ações */}
              <div className="flex gap-2 mt-auto pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl flex-1 gap-2 text-[10px] font-bold uppercase hover:bg-primary/5"
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
                  className={`rounded-xl flex-1 gap-2 text-[10px] font-bold uppercase ${c.ativo ? "text-rose-500 hover:bg-rose-500/5" : "text-emerald-500 hover:bg-emerald-500/5"}`}
                  onClick={() => handleToggle(c.id)}
                >
                  {c.ativo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {c.ativo ? "Inativar" : "Ativar"}
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
