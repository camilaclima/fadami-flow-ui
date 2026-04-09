import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import {
  CheckCircle2,
  Clock,
  FileSearch,
  Code2,
  AlertCircle,
  Zap,
  Target,
  Activity,
  Users,
  Timer,
  Gauge,
  ChevronRight,
  BarChart3,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatCard({ label, value, secondary, icon: Icon, delay, accent, description }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="neu-card neu-card-hover rounded-2xl p-5 group flex flex-col justify-between border-b-4 border-b-transparent hover:border-b-primary/40 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {secondary && (
          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
            {secondary}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-black">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground/60 mt-2 leading-tight">{description}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: rawBacklogs = [] } = useBacklogs();
  const backlogs = rawBacklogs as any[];
  const navigate = useNavigate();

  // --- MÉTRICAS INTELIGENTES ---

  // 1. WIP (Work In Progress) - Itens que estão sendo trabalhados ativamente (Refinamentos)
  const activeWip = backlogs.filter((b) => ["functional_refinement", "technical_refinement"].includes(b.phase)).length;

  // 2. PRONTIDÃO DE BACKLOG (Ready-to-Dev Rate)
  // % de itens que já estão "Disponíveis" vs. o total que ainda não foi para a Sprint
  const unstarted = backlogs.filter((b) => b.phase !== "finished" && b.phase !== "planned");
  const readyToDevRate =
    unstarted.length > 0
      ? Math.round((backlogs.filter((b) => b.phase === "available").length / unstarted.length) * 100)
      : 0;

  // 3. LEAD TIME E ESTIMATIVA DE VAZÃO
  const finished = backlogs.filter((b) => b.phase === "finished");
  const totalHoursInBacklog = backlogs.reduce((acc, b) => acc + (b.refinement?.estimate || 0), 0);

  // 4. MIX DE BACKLOG (Distribuição Funcional vs Técnico)
  const functionalCount = backlogs.filter((b) => b.type === "functional").length;
  const technicalCount = backlogs.filter((b) => b.type === "technical").length;

  // 5. ÍNDICE DE BLOQUEIO (Gargalos Severos)
  // Itens parados em Aprovação ou Refinamento há mais tempo que o normal
  const bottlenecks = backlogs.filter((b) => ["approval", "functional_refinement"].includes(b.phase)).length;

  return (
    <div className="fade-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Live System Analytics
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">Insights de Produto</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de vazão, gargalos e maturidade do Backlog.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right border-r pr-4 border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Esforço Total</p>
            <p className="text-xl font-black text-primary">{totalHoursInBacklog}h</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Maturidade</p>
            <p className="text-xl font-black text-emerald-500">{readyToDevRate}%</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl mb-8">
          <TabsTrigger
            value="strategic"
            className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger
            value="tatico"
            className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Gauge className="w-4 h-4" /> Tático & Fluxo
          </TabsTrigger>
          <TabsTrigger
            value="operational"
            className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        {/* ABA ESTRATÉGICA: FOCO EM RESULTADO E MATURIDADE */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ready to Dev"
              value={`${readyToDevRate}%`}
              icon={Zap}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
              description="Backlog pronto para ser puxado pelo time técnico."
            />
            <StatCard
              label="WIP Ativo"
              value={activeWip}
              icon={Activity}
              delay={0.1}
              description="Itens sendo refinados simultaneamente."
            />
            <StatCard
              label="Mix: Funcional"
              value={`${Math.round((functionalCount / (backlogs.length || 1)) * 100)}%`}
              icon={Layers}
              delay={0.2}
              description="Proporção de novas funcionalidades no total."
            />
            <StatCard
              label="Eficiência"
              value={`${Math.round((finished.length / (backlogs.length || 1)) * 100)}%`}
              icon={CheckCircle2}
              delay={0.3}
              description="Taxa de conclusão histórica do backlog."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="neu-card p-6 rounded-3xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-sm font-bold uppercase tracking-tighter text-muted-foreground mb-4">
                  Saúde do Refinamento
                </h3>
                <div className="flex items-end gap-1 h-32">
                  <div className="flex-1 bg-primary/10 rounded-t-xl h-[40%] flex items-center justify-center text-[10px] font-bold">
                    Aprovação
                  </div>
                  <div className="flex-1 bg-primary/30 rounded-t-xl h-[70%] flex items-center justify-center text-[10px] font-bold text-center">
                    Ref. Func
                  </div>
                  <div className="flex-1 bg-primary rounded-t-xl h-[90%] flex items-center justify-center text-[10px] font-bold">
                    Ref. Técn
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-4 italic">
                  O gráfico mostra a densidade de itens em cada etapa crítica antes da execução.
                </p>
              </div>
            </div>

            <div className="neu-card p-6 rounded-3xl bg-primary/5 border border-primary/10">
              <h3 className="text-sm font-bold uppercase tracking-tighter text-primary mb-4">Insights Gerenciais</h3>
              <ul className="space-y-3">
                <li className="flex gap-2 text-xs items-start">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    O backlog técnico representa{" "}
                    <strong>{Math.round((technicalCount / (backlogs.length || 1)) * 100)}%</strong> do volume total.
                  </span>
                </li>
                <li className="flex gap-2 text-xs items-start">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Existem <strong>{bottlenecks} itens</strong> represados nas fases iniciais de definição.
                  </span>
                </li>
                <li className="flex gap-2 text-xs items-start">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    A carga de trabalho estimada acumulada é de <strong>{totalHoursInBacklog} horas</strong>.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* ABA TÁTICA: FOCO EM PESSOAS E GARGALOS */}
        <TabsContent value="tatico" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 neu-card p-6 rounded-3xl">
              <h2 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Concentração de Gestão (Criação de Itens)
              </h2>
              <div className="space-y-6">
                {Object.entries(
                  backlogs.reduce((acc: any, b) => {
                    const creator = b.created_by || b.createdBy || "Sistema";
                    acc[creator] = (acc[creator] || 0) + 1;
                    return acc;
                  }, {}),
                ).map(([name, count]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                      <span>{name}</span>
                      <span>{count} cards</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(count / (backlogs.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="neu-card p-5 rounded-2xl border-l-4 border-rose-500 bg-rose-500/5">
                <h3 className="text-[10px] font-black uppercase text-rose-600 mb-1">Gargalo Crítico</h3>
                <p className="text-2xl font-bold">{bottlenecks}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase">Itens travados em aprovação</p>
              </div>
              <div className="neu-card p-5 rounded-2xl border-l-4 border-indigo-500">
                <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-1">Foco de Atuação</h3>
                <p className="text-2xl font-bold">{activeWip}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase">Itens em refinamento técnico</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA OPERACIONAL: LISTAGEM E FLUXO IMEDIATO */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["approval", "functional_refinement", "technical_refinement", "available"].map((p, i) => (
              <StatCard
                key={p}
                label={PHASE_LABELS[p as Phase]}
                value={backlogs.filter((b) => b.phase === p).length}
                icon={[FileSearch, Clock, Code2, CheckCircle2][i]}
                delay={i * 0.1}
              />
            ))}
          </div>

          <div className="neu-card p-6 rounded-3xl">
            <h2 className="text-sm font-bold mb-4 flex items-center justify-between">
              Itens em Espera (Top 5 Antigos)
              <span className="text-[10px] font-normal text-muted-foreground italic">Clique para gerenciar</span>
            </h2>
            <div className="divide-y divide-border">
              {backlogs
                .filter((b) => b.phase !== "finished")
                .slice(0, 5)
                .map((b) => (
                  <div
                    key={b.id}
                    className="py-4 flex items-center justify-between hover:bg-foreground/[0.02] cursor-pointer transition-colors px-2 rounded-lg"
                    onClick={() => navigate("/backlogs")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        #{b.id.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{b.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                          {PHASE_LABELS[b.phase as Phase]} • {b.type === "functional" ? "Funcional" : "Técnico"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
