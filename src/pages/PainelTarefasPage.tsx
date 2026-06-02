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

  const [tab, setTab] = useState("blockers");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoordinatorTask | null>(null);

  const pending = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const critical = useMemo(() => pending.filter((t) => t.urgency === "critical" || t.urgency === "high"), [pending]);
  const improvements = useMemo(() => pending.filter((t) => t.source === "ai" && t.category === "schedule_risk"), [pending]);

  const blockerTasks = useMemo(() => pending.filter((t) => t.category === "blocker" || (t.source === "manual" && t.category === "custom")), [pending]);
  const riskTasks = useMemo(() => pending.filter((t) => t.category === "schedule_risk"), [pending]);
  const activityTasks = useMemo(() => pending.filter((t) => t.category === "activity"), [pending]);

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
        <TabsList>
          <TabsTrigger value="blockers" className="gap-2">🚨 Bloqueios e Gargalos <span className="text-xs opacity-70">({blockerTasks.length})</span></TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">📅 Riscos de Cronograma <span className="text-xs opacity-70">({riskTasks.length})</span></TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">🧩 Atividades <span className="text-xs opacity-70">({activityTasks.length})</span></TabsTrigger>
        </TabsList>

        <TabsContent value="blockers" className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && blockerTasks.length === 0 && (
            <Card className="neu-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum bloqueio ativo. Use “Gerar análise com IA” para que o sistema leia as últimas dailys e crie ações automáticas.
            </CardContent></Card>
          )}
          {blockerTasks.map((t) => (
            <TaskCard key={t.id} task={t}
              productName={prodName(t.product_id)}
              sprintName={sprintName(t.sprint_id)}
              memberName={memberName(t.responsible_member_id)}
              onEdit={t.source === "manual" ? openEdit : undefined}
            />
          ))}
        </TabsContent>

        <TabsContent value="risks" className="mt-4 space-y-3">
          {!isLoading && riskTasks.length === 0 && (
            <Card className="neu-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Sem riscos detectados no momento.
            </CardContent></Card>
          )}
          {riskTasks.map((t) => (
            <TaskCard key={t.id} task={t}
              productName={prodName(t.product_id)}
              sprintName={sprintName(t.sprint_id)}
              memberName={memberName(t.responsible_member_id)}
              onEdit={t.source === "manual" ? openEdit : undefined}
            />
          ))}
        </TabsContent>

        <TabsContent value="activities" className="mt-4 space-y-3">
          {!isLoading && activityTasks.length === 0 && (
            <Card className="neu-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade cadastrada nesta categoria.
            </CardContent></Card>
          )}
          {activityTasks.map((t) => (
            <TaskCard key={t.id} task={t}
              productName={prodName(t.product_id)}
              sprintName={sprintName(t.sprint_id)}
              memberName={memberName(t.responsible_member_id)}
              onEdit={t.source === "manual" ? openEdit : undefined}
            />
          ))}
        </TabsContent>
      </Tabs>

      <NewTaskModal open={modalOpen} onOpenChange={setModalOpen} productIds={productIds} editing={editing} />
    </div>
  );
}