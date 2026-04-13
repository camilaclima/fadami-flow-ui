import { useState } from "react";
import { useSprints, useAddSprint, useUpdateSprint, useDeleteSprint } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { SPRINT_STATUS_LABELS } from "@/types/sprint";
import type { Sprint, SprintStatus } from "@/types/sprint";
import { SprintFormModal } from "@/components/sprint/SprintFormModal";
import { SprintDetailModal } from "@/components/sprint/SprintDetailModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_STYLES: Record<SprintStatus, string> = {
  planned: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  finished: "bg-muted text-muted-foreground border-border",
};

export default function SprintsPage() {
  const { user } = useAuth();
  const { data: sprints = [] } = useSprints();
  const { data: products = [] } = useProducts();
  const addSprint = useAddSprint();
  const updateSprint = useUpdateSprint();
  const deleteSprint = useDeleteSprint();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sprint | null>(null);
  const [detailSprint, setDetailSprint] = useState<Sprint | null>(null);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const handleNew = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (s: Sprint) => { setEditing(s); setFormOpen(true); };

  const handleSave = (data: any) => {
    if (editing) {
      updateSprint.mutate({ id: editing.id, ...data });
    } else {
      addSprint.mutate({ ...data, coordinator_id: user?.id ?? "" });
    }
  };

  const renderTable = (list: Sprint[]) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sprint</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((s) => (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailSprint(s)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{s.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.product_id ? productMap[s.product_id] ?? "—" : "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(s.start_date), "dd/MM/yy", { locale: ptBR })} — {format(new Date(s.end_date), "dd/MM/yy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[s.status as SprintStatus]}>
                  {SPRINT_STATUS_LABELS[s.status as SprintStatus] ?? s.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setDetailSprint(s)}><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                {s.status === "planned" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSprint.mutate(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                Nenhuma sprint nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </motion.div>
  );

  const planned = sprints.filter((s) => s.status === "planned");
  const active = sprints.filter((s) => s.status === "active");
  const finished = sprints.filter((s) => s.status === "finished");

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sprints</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as sprints do seu projeto</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Sprint
        </Button>
      </div>

      <Tabs defaultValue="planned">
        <TabsList>
          <TabsTrigger value="planned">Planejadas ({planned.length})</TabsTrigger>
          <TabsTrigger value="active">Em Execução ({active.length})</TabsTrigger>
          <TabsTrigger value="finished">Histórico ({finished.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="planned" className="mt-4">{renderTable(planned)}</TabsContent>
        <TabsContent value="active" className="mt-4">{renderTable(active)}</TabsContent>
        <TabsContent value="finished" className="mt-4">{renderTable(finished)}</TabsContent>
      </Tabs>

      <SprintFormModal open={formOpen} onOpenChange={setFormOpen} sprint={editing} onSave={handleSave} />
      {detailSprint && (
        <SprintDetailModal open={!!detailSprint} onOpenChange={(o) => !o && setDetailSprint(null)} sprint={detailSprint} />
      )}
    </div>
  );
}
