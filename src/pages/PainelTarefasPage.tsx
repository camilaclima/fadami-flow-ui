import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, AlertTriangle, Lightbulb, ListTodo, Loader2 } from "lucide-react";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { useCoordinatorTasks, useGenerateAITasks, CoordinatorTask } from "@/hooks/useCoordinatorTasks";
import { useActiveProducts } from "@/hooks/useProducts";
import { useSprints } from "@/hooks/useSprints";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { TaskCard } from "@/components/painel/TaskCard";
import { NewTaskModal } from "@/components/painel/NewTaskModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function MetricCard({ icon: Icon, label, value, tone }: any) {
  const toneCls = tone === "critical" ? "text-destructive" : tone === "info" ? "text-blue-500" : "text-foreground";
  return (
    <Card className="neu-card flex-1 min-w-[180px]">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${toneCls}`}><Icon className="w-5 h-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${toneCls}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PainelTarefasPage() {
  const { productIds } = useAuthorizedProducts();
  const { data: tasks = [], isLoading } = useCoordinatorTasks(productIds);
  const { data: products = [] } = useActiveProducts();
  const { data: sprints = [] } = useSprints();
  const { data: members = [] } = useTeamMembers();
  const generate = useGenerateAITasks();

  const [tab, setTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoordinatorTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "all">("pending");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [sprintFilter, setSprintFilter] = useState<string>("all");

  const filtered = useMemo(() => tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (productFilter !== "all" && t.product_id !== productFilter) return false;
    if (sprintFilter !== "all" && t.sprint_id !== sprintFilter) return false;
    return true;
  }), [tasks, statusFilter, productFilter, sprintFilter]);

  const pending = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const critical = useMemo(() => pending.filter((t) => t.urgency === "critical" || t.urgency === "high"), [pending]);
  const improvements = useMemo(() => pending.filter((t) => t.source === "ai" && t.category === "schedule_risk"), [pending]);

  const blockerTasks = useMemo(() => filtered.filter((t) => t.category === "blocker" || (t.source === "manual" && t.category === "custom")), [filtered]);
  const riskTasks = useMemo(() => filtered.filter((t) => t.category === "schedule_risk"), [filtered]);
  const activityTasks = useMemo(() => filtered.filter((t) => t.category === "activity"), [filtered]);

  const visibleProducts = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products),
    [products, productIds]
  );
  const visibleSprints = useMemo(() => {
    if (productFilter === "all") return sprints;
    return sprints.filter((s: any) => s.product_id === productFilter);
  }, [sprints, productFilter]);

  const prodName = (id: string | null) => products.find((p) => p.id === id)?.name;
  const sprintName = (id: string | null) => (sprints.find((s) => s.id === id) as any)?.name;
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name;

  const openEdit = (t: CoordinatorTask) => { setEditing(t); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-3">
        <MetricCard icon={ListTodo} label="Ações Pendentes" value={pending.length} />
        <MetricCard icon={AlertTriangle} label="Alertas Críticos" value={critical.length} tone="critical" />
        <MetricCard icon={Lightbulb} label="Sugestões de Melhoria" value={improvements.length} tone="info" />
        <div className="flex flex-col gap-2 ml-auto">
          <Button variant="outline" onClick={() => generate.mutate(productIds)} disabled={generate.isPending} className="gap-2">
            {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar análise com IA
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nova Tarefa</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">📋 Todas <span className="text-xs opacity-70">({filtered.length})</span></TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">🧩 Atividades <span className="text-xs opacity-70">({activityTasks.length})</span></TabsTrigger>
            <TabsTrigger value="blockers" className="gap-2">🚨 Bloqueios e Gargalos <span className="text-xs opacity-70">({blockerTasks.length})</span></TabsTrigger>
            <TabsTrigger value="risks" className="gap-2">📅 Riscos de Cronograma <span className="text-xs opacity-70">({riskTasks.length})</span></TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="resolved">Concluídas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setSprintFilter("all"); }}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {visibleProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Sprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as sprints</SelectItem>
                {visibleSprints.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(() => {
          const renderGrid = (items: CoordinatorTask[], emptyMsg: string) => {
            if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
            if (!items.length) return (
              <Card className="neu-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyMsg}</CardContent></Card>
            );
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((t) => (
                  <TaskCard key={t.id} task={t}
                    productName={prodName(t.product_id)}
                    sprintName={sprintName(t.sprint_id)}
                    memberName={memberName(t.responsible_member_id)}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            );
          };
          return (
            <>
              <TabsContent value="all" className="mt-4">
                {renderGrid(filtered, "Nenhuma tarefa para os filtros selecionados.")}
              </TabsContent>
              <TabsContent value="activities" className="mt-4">
                {renderGrid(activityTasks, "Nenhuma atividade cadastrada nesta categoria.")}
              </TabsContent>
              <TabsContent value="blockers" className="mt-4">
                {renderGrid(blockerTasks, "Nenhum bloqueio ativo. Use “Gerar análise com IA” para que o sistema leia as últimas dailys e crie ações automáticas.")}
              </TabsContent>
              <TabsContent value="risks" className="mt-4">
                {renderGrid(riskTasks, "Sem riscos detectados no momento.")}
              </TabsContent>
            </>
          );
        })()}
      </Tabs>

      <NewTaskModal open={modalOpen} onOpenChange={setModalOpen} productIds={productIds} editing={editing} />
    </div>
  );
}