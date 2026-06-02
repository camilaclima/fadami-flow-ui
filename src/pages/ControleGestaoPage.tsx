import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ClipboardList, Kanban, FolderKanban, Settings } from "lucide-react";
import DailyStatusPage from "./DailyStatusPage";
import TeamProjectConfigPage from "./TeamProjectConfigPage";
import MetasCronogramasPage from "./MetasCronogramasPage";
import PainelTarefasPage from "./PainelTarefasPage";
import DashboardGeralPage from "./DashboardGeralPage";

export default function ControleGestaoPage() {
  const [tab, setTab] = useState("dashboard");
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setTab(detail);
    };
    window.addEventListener("dashboard:navigate-tab", h);
    return () => window.removeEventListener("dashboard:navigate-tab", h);
  }, []);
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Controle e Gestão</h1>
        <p className="text-sm text-muted-foreground">Visão unificada da sua gestão de projetos.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" /> Dashboard Geral
          </TabsTrigger>
          <TabsTrigger value="dailys" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-4 w-4" /> Registro de Dailys
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Kanban className="h-4 w-4" /> Painel de Tarefas
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FolderKanban className="h-4 w-4" /> Metas e Cronogramas
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardGeralPage />
        </TabsContent>
        <TabsContent value="dailys">
          <DailyStatusPage embedded />
        </TabsContent>
        <TabsContent value="tasks">
          <PainelTarefasPage />
        </TabsContent>
        <TabsContent value="projects">
          <MetasCronogramasPage />
        </TabsContent>
        <TabsContent value="settings">
          <TeamProjectConfigPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}