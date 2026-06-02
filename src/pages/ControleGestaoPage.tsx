import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ClipboardList, Kanban, FolderKanban, Settings } from "lucide-react";
import DailyStatusPage from "./DailyStatusPage";
import TeamProjectConfigPage from "./TeamProjectConfigPage";

function EmptyTab({ title }: { title: string }) {
  return (
    <div className="neu-card rounded-2xl p-16 text-center border">
      <p className="text-lg font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">Em desenvolvimento. Em breve traremos novidades.</p>
    </div>
  );
}

export default function ControleGestaoPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Controle e Gestão</h1>
        <p className="text-sm text-muted-foreground">Visão unificada da sua gestão de projetos.</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard Geral
          </TabsTrigger>
          <TabsTrigger value="dailys" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Registro de Dailys
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <Kanban className="h-4 w-4" /> Painel de Tarefas
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" /> Projetos
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <EmptyTab title="Dashboard Geral" />
        </TabsContent>
        <TabsContent value="dailys">
          <div className="-mx-6 -mt-2">
            <DailyStatusPage />
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          <EmptyTab title="Painel de Tarefas" />
        </TabsContent>
        <TabsContent value="projects">
          <EmptyTab title="Projetos" />
        </TabsContent>
        <TabsContent value="settings">
          <div className="-mx-6 -mt-2">
            <TeamProjectConfigPage />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}