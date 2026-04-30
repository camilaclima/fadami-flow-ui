import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, UsersRound, Loader2, Pencil, Trash2, Crown, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useSquads, useDeleteSquad, type Squad } from "@/hooks/useSquads";
import { useActiveProducts } from "@/hooks/useProducts";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useProfiles } from "@/hooks/useProfiles";
import { SquadFormModal } from "@/components/squads/SquadFormModal";

export default function SquadsPage() {
  const { data: squads = [], isLoading } = useSquads();
  const { data: products = [] } = useActiveProducts();
  const { data: members = [] } = useTeamMembers();
  const { data: profiles = [] } = useProfiles();
  const del = useDeleteSquad();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Squad | null>(null);
  const [deleting, setDeleting] = useState<Squad | null>(null);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Squads</h1>
            <p className="text-sm text-muted-foreground">Cadastre squads, líderes, membros e produtos vinculados.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Squad
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : squads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <UsersRound className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma squad cadastrada ainda.</p>
            <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Cadastrar primeira squad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {squads.map((s) => {
            const leader = s.leader_profile_id ? profileMap[s.leader_profile_id] : null;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base truncate">{s.name}</CardTitle>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(s); setOpenForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(s)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-muted-foreground">Líder:</span>
                      <span className="font-medium truncate">
                        {leader ? `${leader.first_name} ${leader.last_name}` : "—"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3.5 w-3.5" /> Produtos ({s.product_ids.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.product_ids.map((pid) => {
                          const p = productMap[pid];
                          if (!p) return null;
                          return (
                            <Badge key={pid} variant="outline" className="text-[10px] gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                              {p.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs text-muted-foreground">Membros ({s.member_ids.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {s.member_ids.slice(0, 6).map((mid) => {
                          const m = memberMap[mid];
                          return m ? (
                            <Badge key={mid} variant="secondary" className="text-[10px]">{m.name}</Badge>
                          ) : null;
                        })}
                        {s.member_ids.length > 6 && (
                          <Badge variant="secondary" className="text-[10px]">+{s.member_ids.length - 6}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {openForm && (
        <SquadFormModal
          key={editing?.id ?? "new-squad"}
          open={openForm}
          onOpenChange={setOpenForm}
          squad={editing}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir squad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a squad "{deleting?.name}" e seus vínculos. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
