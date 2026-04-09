import { useBacklogs } from "@/hooks/useBacklogs";
import { PHASES, PHASE_LABELS, type Phase } from "@/types/backlog";
import {
  BarChart3,
  TrendingUp,
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
      className="neu-card neu-card-hover rounded-2xl p-5 group flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${accent ?? "bg-primary/10"} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        {secondary && (
          <span className="text-[10px] font-bold text-muted-foreground bg-foreground/5 px-2 py-1 rounded-lg">
            {secondary}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">{label}</p>
        {description && <p className="text-[9px] text-muted-foreground/60 mt-2 italic">{description}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  // Mudamos aqui para garantir que pegamos os dados e tratamos como o tipo correto
  const { data: backlogs = [] } = useBacklogs();
  const navigate = useNavigate();

  const finishedItems = backlogs.filter((b) => b.phase === "finished");

  // 1. LEAD TIME MÉDIO (Corrigido para usar created_at)
  const calculateLeadTime = () => {
    if (finishedItems.length === 0) return 0;
    const totalDays = finishedItems.reduce((acc, b) => {
      const start = new Date(b.created_at).getTime();
      // Usamos o updated_at como fallback para a data de finalização
      const end = new Date(b.updated_at || Date.now()).getTime();
      return acc + (end - start);
    }, 0);
    return Math.round(totalDays / (1000 * 60 * 60 * 24) / finishedItems.length);
  };

  // 2. TAXA DE PRODUTIVIDADE
  const productivityRate = backlogs.length > 0 ? Math.round((finishedItems.length / backlogs.length) * 100) : 0;

  // 3. PERFORMANCE POR CRIADOR (Corrigido para usar created_by)
  const creatorStats = backlogs.reduce((acc: any, b) => {
    const creator = b.created_by || "Sistema";
    acc[creator] = (acc[creator] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cockpit FadamiFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de Performance e Gargalos</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
          <span className="text-[10px] font-bold text-primary uppercase block">Produtividade Global</span>
          <span className="text-xl font-black text-primary">{productivityRate}%</span>
        </div>
      </div>

      <Tabs defaultValue="tatico" className="w-full">
        <TabsList className="bg-foreground/[0.04] border border-border/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="strategic" className="gap-2">
            <Target className="w-4 h-4" /> Estratégico
          </TabsTrigger>
          <TabsTrigger value="tatico" className="gap-2">
            <Gauge className="w-4 h-4" /> Tático
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2">
            <Activity className="w-4 h-4" /> Operacional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategic" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Lead Time Médio"
              value={`${calculateLeadTime()} dias`}
              icon={Timer}
              delay={0}
              accent="bg-blue-500/10 text-blue-500"
            />
            <StatCard label="Eficiência" value={`${productivityRate}%`} icon={Zap} delay={0.1} />
            <StatCard label="Finalizados" value={finishedItems.length} icon={CheckCircle2} delay={0.2} />
            <StatCard label="Meta de Entrega" value="85%" icon={Target} delay={0.3} />
          </div>
        </TabsContent>

        <TabsContent value="tatico" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Itens em Aberto" value={backlogs.length - finishedItems.length} icon={Clock} delay={0} />
            <StatCard label="Colaboradores" value={Object.keys(creatorStats).length} icon={Users} delay={0.2} />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-6">Distribuição por Responsável</h2>
            <div className="space-y-4">
              {Object.entries(creatorStats).map(([name, count]: any) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="text-xs font-medium w-32 truncate">{name}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(count / backlogs.length) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pronto p/ Sprint"
              value={backlogs.filter((b) => b.phase === "available").length}
              icon={CheckCircle2}
              delay={0}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              label="Ref. Funcional"
              value={backlogs.filter((b) => b.phase === "functional_refinement").length}
              icon={FileSearch}
              delay={0.1}
            />
            <StatCard
              label="Ref. Técnico"
              value={backlogs.filter((b) => b.phase === "technical_refinement").length}
              icon={Code2}
              delay={0.2}
            />
            <StatCard
              label="Em Aprovação"
              value={backlogs.filter((b) => b.phase === "approval").length}
              icon={AlertCircle}
              delay={0.3}
            />
          </div>

          <div className="neu-card p-6 rounded-2xl">
            <h2 className="text-sm font-bold mb-4">Gargalos de Fluxo</h2>
            <div className="space-y-2">
              {backlogs
                .filter((b) => b.phase !== "finished")
                .slice(0, 5)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-foreground/[0.02]"
                  >
                    <span className="text-xs font-medium">{b.title}</span>
                    {/* Fix para o erro de Type 'string' is not assignable to 'Phase' */}
                    <span className="text-[10px] text-muted-foreground italic">
                      Status: {PHASE_LABELS[b.phase as Phase] || b.phase}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
